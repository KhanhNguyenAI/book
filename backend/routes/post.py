from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.post import Post
from models.user import User
from utils.error_handler import create_error_response
import logging
import os
import time

logger = logging.getLogger(__name__)

post_bp = Blueprint('post', __name__)

def get_supabase():
    """Get Supabase client"""
    try:
        from supabase import create_client
        url = "https://vcqhwonimqsubvqymgjx.supabase.co"
        key = os.getenv("SUPABASE_SERVICE_ROLE")
        if not key:
            logger.error("SUPABASE_SERVICE_ROLE not set")
            return None
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Error creating Supabase client: {str(e)}")
        return None


@post_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    """Create a new post/status"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return create_error_response('User not found', 404)

        if user.is_banned:
            return create_error_response('Account is banned', 403)

        data = request.get_json()
        content = data.get('content', '').strip() if data.get('content') else ''
        image_url = data.get('image_url', '').strip() if data.get('image_url') else None

        # Validate: must have either content or image
        if not content and not image_url:
            return create_error_response('Post must have either content or image', 400)

        # Create post
        post = Post(
            user_id=user_id,
            content=content if content else None,
            image_url=image_url if image_url else None
        )

        db.session.add(post)
        db.session.commit()

        logger.info(f"Post created successfully: {post.id} by user {user_id}")

        return jsonify({
            'status': 'success',
            'message': 'Post created successfully',
            'post': post.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        db.session.rollback()
        return create_error_response(str(e), 500)


@post_bp.route('/posts', methods=['GET'])
@jwt_required()
def get_posts():
    """Get all posts (feed) with pagination"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_filter = request.args.get('user_id', type=int)  # Filter by specific user

        # Build query
        query = Post.query

        # Filter by user if specified
        if user_filter:
            query = query.filter(Post.user_id == user_filter)

        # Order by created_at descending (newest first)
        query = query.order_by(Post.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        posts = pagination.items

        return jsonify({
            'status': 'success',
            'posts': [post.to_dict() for post in posts],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting posts: {str(e)}")
        return create_error_response(str(e), 500)


@post_bp.route('/posts/<int:post_id>', methods=['GET'])
@jwt_required()
def get_post(post_id):
    """Get a specific post by ID"""
    try:
        post = Post.query.get(post_id)

        if not post:
            return create_error_response('Post not found', 404)

        return jsonify({
            'status': 'success',
            'post': post.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Error getting post: {str(e)}")
        return create_error_response(str(e), 500)


@post_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    """Delete a post (only by owner or admin)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return create_error_response('User not found', 404)

        post = Post.query.get(post_id)

        if not post:
            return create_error_response('Post not found', 404)

        # Check permission: owner or admin
        if post.user_id != user_id and user.role != 'admin':
            return create_error_response('Permission denied', 403)

        # Delete image from Supabase if exists
        if post.image_url:
            try:
                supabase = get_supabase()
                if supabase:
                    # Extract file path from URL
                    # URL format: https://...supabase.co/storage/v1/object/public/user-assets/posts/...
                    if 'user-assets' in post.image_url:
                        # Try to extract path
                        parts = post.image_url.split('user-assets/')
                        if len(parts) > 1:
                            file_path = parts[1]
                            try:
                                supabase.storage.from_("user-assets").remove([file_path])
                                logger.info(f"Deleted image from Supabase: {file_path}")
                            except Exception as e:
                                logger.warning(f"Failed to delete image from Supabase: {str(e)}")
            except Exception as e:
                logger.warning(f"Error deleting image from Supabase: {str(e)}")

        db.session.delete(post)
        db.session.commit()

        logger.info(f"Post deleted successfully: {post_id} by user {user_id}")

        return jsonify({
            'status': 'success',
            'message': 'Post deleted successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error deleting post: {str(e)}")
        db.session.rollback()
        return create_error_response(str(e), 500)


@post_bp.route('/posts/upload-image', methods=['POST'])
@jwt_required()
def upload_post_image():
    """Upload image for post to Supabase"""
    try:
        supabase = get_supabase()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.is_banned:
            return jsonify({"error": "Account is banned"}), 403

        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            return jsonify({"error": "Only image files (PNG, JPG, JPEG, GIF, WebP) are allowed"}), 400

        # Validate file size (10MB max for posts)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return jsonify({"error": "File size must be less than 10MB"}), 400

        # Check Supabase client
        if supabase is None:
            logger.error("Supabase client is None in upload_post_image")
            return jsonify({"error": "Storage service not available"}), 503

        # Generate filename
        timestamp = int(time.time())
        file_name = f"{user_id}_{timestamp}.{file_ext}"
        file_path = f"posts/{file_name}"

        logger.info(f"Uploading post image for user {user_id}: {file_path}")

        try:
            # Read file content
            file_content = file.read()

            # Upload to Supabase
            logger.info(f"Starting Supabase upload to {file_path}")
            result = supabase.storage.from_("user-assets").upload(
                file_path,
                file_content,
                {"content-type": file.content_type}
            )

            # Check result
            if hasattr(result, 'error') and result.error:
                error_msg = f"Supabase upload error: {result.error.message}"
                logger.error(error_msg)
                return jsonify({
                    "error": "Upload failed",
                    "debug": error_msg
                }), 500

            logger.info("Upload successful, generating URL...")

            # Get public URL
            try:
                public_url = supabase.storage.from_("user-assets").get_public_url(file_path)
                logger.info(f"Generated URL: {public_url}")
            except Exception as url_error:
                logger.error(f"URL generation failed: {str(url_error)}")
                return jsonify({
                    "error": "Failed to generate image URL",
                    "debug": str(url_error)
                }), 500

            logger.info(f"Post image uploaded successfully for user {user_id}")

            return jsonify({
                "status": "success",
                "message": "Image uploaded successfully",
                "image_url": public_url
            }), 200

        except Exception as upload_error:
            logger.error(f"Upload process error: {str(upload_error)}")
            return jsonify({
                "error": "Upload failed",
                "debug": str(upload_error)
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in upload_post_image: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# backend/routes/message.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from flask_socketio import emit, join_room, leave_room
from extensions import db

from models.message import Message
from models.message_report import MessageReport
from models.chat_room import ChatRoom
from models.chat_room_member import ChatRoomMember

from models.user import User
from middleware.auth_middleware import admin_required, sanitize_input
from utils.error_handler import create_error_response
from utils.image_utils import convert_image_to_webp
from datetime import datetime
from urllib.parse import urlparse
import logging
import os
from dotenv import load_dotenv

from supabase import create_client
import time 

logger = logging.getLogger(__name__)
message_bp = Blueprint('message', __name__)

# SocketIO instance (injected from app.py)
socketio = None

# Track users in rooms: {room_id: {user_id1, user_id2, ...}}
room_users = {}
def get_supabase():
    from supabase import create_client
    url = os.getenv("SUPABASE_URL", "https://vcqhwonimqsubvqymgjx.supabase.co")
    key = os.getenv("SUPABASE_SERVICE_ROLE")
    if not key:
        logger.error("SUPABASE_SERVICE_ROLE not set")
        return None
    return create_client(url, key)


def init_socketio(socketio_instance):
    """Initialize SocketIO instance"""
    global socketio
    socketio = socketio_instance
    if socketio is None:
        logger.error("SocketIO instance initialization failed")
        raise ValueError("SocketIO instance cannot be None")
    else:
        logger.info("✅ SocketIO initialized successfully for messages")

# Validation helper
def validate_image_url(url):
    """Validate image URL format and ensure it's an image"""
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        return url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))
    except Exception:
        return False

# Helper function to serialize message data với room support
def message_to_dict(message, include_user=True):
    """Convert Message object to dict"""
    data = {
        'id': message.id,
        'content': message.content,
        'image_url': message.image_url or '',
        'room_id': message.room_id,
        'parent_id': message.parent_id,
        'is_deleted': message.is_deleted,
        'replies_count': Message.query.filter_by(parent_id=message.id, is_deleted=False).count(),
        'created_at': message.created_at.isoformat() if message.created_at else None,
        'updated_at': message.updated_at.isoformat() if message.updated_at else None
    }
    if include_user and message.user:
        data['user'] = {
            'id': message.user.id,
            'username': message.user.username,
            'avatar_url': message.user.avatar_url or '',
            'role': message.user.role,
            'is_banned': message.user.is_banned
        }
    return data

# ============================================
# HELPER: Broadcast functions for SocketIO với room support
# ============================================

# backend/routes/message.py - FIX BROADCAST FUNCTION
# backend/routes/message.py - FIX BROADCAST FUNCTION
# backend/routes/message.py - FIX BROADCAST FUNCTION
def broadcast_new_message(message, user):
    """Broadcast new message to specific room - FIXED VERSION"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting new message")
        return
    
    try:
        # ✅ Đảm bảo message có user data
        message_data = message_to_dict(message)
        
        logger.info(f"📢 Broadcasting message {message.id} to room {message.room_id}")
        logger.info(f"📊 Message data: {message_data}")
        
        # ✅ FIX QUAN TRỌNG: Thêm namespace '/chat'
        socketio.emit('new_message', message_data, 
                     namespace='/chat', room=str(message.room_id))
        
        logger.info(f"✅ Successfully broadcasted message {message.id} to room {message.room_id}")
        
    except Exception as e:
        logger.error(f"❌ Error broadcasting new message {message.id}: {str(e)}")
# Sửa tất cả các hàm broadcast để có namespace
def broadcast_message_deleted(message_id, room_id, deleted_by_admin=False):
    """Broadcast message deletion event to specific room"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting message deletion")
        return
    try:
        socketio.emit('message_deleted', {
            'message_id': message_id,
            'room_id': room_id,
            'deleted_by_admin': deleted_by_admin
        }, namespace='/chat', room=str(room_id))  # ✅ THÊM NAMESPACE
        logger.debug(f"Broadcasted deletion of message {message_id} in room {room_id}")
    except Exception as e:
        logger.error(f"Error broadcasting message deletion {message_id}: {str(e)}")

def broadcast_reply_added(parent_id, room_id):
    """Broadcast reply count update to specific room"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting reply added")
        return
    try:
        replies_count = Message.query.filter_by(parent_id=parent_id, is_deleted=False).count()
        socketio.emit('reply_added', {
            'parent_id': parent_id,
            'room_id': room_id,
            'replies_count': replies_count
        }, namespace='/chat', room=str(room_id))  # ✅ THÊM NAMESPACE
        logger.debug(f"Broadcasted reply count update for parent {parent_id} in room {room_id}")
    except Exception as e:
        logger.error(f"Error broadcasting reply added for parent {parent_id}: {str(e)}")

def broadcast_message_updated(message):
    """Broadcast message update to specific room"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting message update")
        return
    try:
        socketio.emit('message_updated', message_to_dict(message), 
                     namespace='/chat', room=str(message.room_id))  # ✅ THÊM NAMESPACE
        logger.debug(f"Broadcasted update for message {message.id} in room {message.room_id}")
    except Exception as e:
        logger.error(f"Error broadcasting message update {message.id}: {str(e)}")
# ============================================
# AUTHENTICATION HELPER FUNCTIONS
# ============================================

def get_user_from_token(token):
    """Extract user from JWT token"""
    try:
        if not token:
            return None
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        decoded_token = decode_token(token)
        user_id = decoded_token['sub']
        user = User.query.get(user_id)
        
        return user
    except Exception as e:
        logger.error(f"Token validation failed: {str(e)}")
        return None

def authenticate_socket_connection():
    """Authenticate socket connection using JWT token - WITH DEBUG"""
    try:
        logger.info("🔐 AUTHENTICATION PROCESS STARTED")
        
        # Try to get token from different sources
        token = None
        
        # 1. From query string
        token = request.args.get('token')
        logger.info(f"🔍 Token from query string: {token is not None}")
        
        # 2. From headers
        if not token and 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            logger.info(f"🔍 Authorization header: {auth_header}")
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
                logger.info(f"🔍 Token from headers: {token is not None}")
        
        # 3. From socket auth data
        if not token and hasattr(request, 'auth') and request.auth:
            token = request.auth.get('token')
            logger.info(f"🔍 Token from auth data: {token is not None}")
        
        if not token:
            logger.error("❌ NO TOKEN FOUND IN ANY SOURCE")
            return None
        
        logger.info(f"🔑 Token found, length: {len(token)}")
        logger.info(f"🔑 Token preview: {token[:20]}...")
        
        user = get_user_from_token(token)
        if not user:
            logger.error("❌ INVALID TOKEN OR USER NOT FOUND")
            return None
        
        if user.is_banned:
            logger.info(f"❌ BANNED USER: {user.id}")
            return None
        
        logger.info(f"✅ USER AUTHENTICATED: {user.username} (ID: {user.id})")
        return user
        
    except Exception as e:
        logger.error(f"❌ AUTHENTICATION ERROR: {str(e)}")
        return None
# ============================================
# MEMBER: View Messages với room support
# ============================================

@message_bp.route('/messages/room/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room_messages(room_id):
    """Get messages from specific room with pagination"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return create_error_response('User not found', 404)
        
        # Check room permissions
        room = ChatRoom.query.get(room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        # For global room, no membership required
        if not room.is_global:
            member = ChatRoomMember.query.filter_by(user_id=user_id, room_id=room_id).first()
            if not member:
                return create_error_response('You are not a member of this room', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        parent_id = request.args.get('parent_id', None, type=int)
        
        # Build query
        messages_query = Message.query.filter_by(
            room_id=room_id, 
            is_deleted=False
        )
        
        if parent_id:
            # Get replies to a specific message
            messages_query = messages_query.filter_by(parent_id=parent_id)
        else:
            # Get main messages (no parent)
            messages_query = messages_query.filter_by(parent_id=None)
        
        messages_query = messages_query.options(db.joinedload(Message.user))\
         .order_by(Message.created_at.desc())
        
        paginated = messages_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = [message_to_dict(msg) for msg in paginated.items]
        
        # For main messages, return in chronological order
        if not parent_id:
            result.reverse()
        
        logger.info(f"Retrieved {len(result)} messages from room {room_id} for user {user_id}")
        return jsonify({
            'status': 'success',
            'messages': result,
            'room': {
                'id': room.id,
                'name': room.name,
                'is_global': room.is_global
            },
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching messages for room {room_id}: {str(e)}")
        return create_error_response(str(e), 500)

@message_bp.route('/messages', methods=['GET'])
@jwt_required()
def get_messages():
    """Get messages from global room (backward compatibility)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return create_error_response('User not found', 404)
        
        # Tìm global room
        global_room = ChatRoom.query.filter_by(is_global=True).first()
        if not global_room:
            return create_error_response('Global room not found', 404)
        
        return get_room_messages(global_room.id)
        
    except Exception as e:
        logger.error(f"Error fetching global messages: {str(e)}")
        return create_error_response(str(e), 500)

@message_bp.route('/messages/<int:message_id>/replies', methods=['GET'])
@jwt_required()
def get_message_replies(message_id):
    """Get replies to a specific message"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return create_error_response('User not found', 404)
        
        # Get parent message
        parent_message = Message.query.get(message_id)
        if not parent_message or parent_message.is_deleted:
            return create_error_response('Message not found', 404)
        
        # Check room permissions
        room = ChatRoom.query.get(parent_message.room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        if not room.is_global:
            member = ChatRoomMember.query.filter_by(user_id=user_id, room_id=room.id).first()
            if not member:
                return create_error_response('You are not a member of this room', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        replies_query = Message.query.filter_by(
            parent_id=message_id,
            is_deleted=False
        ).options(db.joinedload(Message.user))\
         .order_by(Message.created_at.asc())  # Chronological order for replies
        
        paginated = replies_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = [message_to_dict(msg) for msg in paginated.items]
        
        logger.info(f"User {user_id} retrieved {len(result)} replies for message {message_id}")
        return jsonify({
            'status': 'success',
            'replies': result,
            'parent_message': message_to_dict(parent_message),
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching replies for message {message_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Send Message với room support
# ============================================

# backend/routes/message.py - FIX BROADCAST
@message_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    """Send message to specific room với room_id - FIXED VERSION"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to send message")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        # ✅ FIX: Safely get and sanitize content
        raw_content = data.get('content')
        content = sanitize_input(raw_content.strip()) if raw_content else None
        
        room_id = data.get('room_id')
        parent_id = data.get('parent_id')
        
        # ✅ FIX: Safely get and sanitize image_url
        raw_image_url = data.get('image_url')
        image_url = raw_image_url.strip() if raw_image_url else None
        
        logger.info(f"📝 Sending message - User: {user_id}, Room: {room_id}, Content: {content is not None}, Image: {image_url is not None}")
        
        # Nếu không có room_id, sử dụng global room
        if not room_id:
            global_room = ChatRoom.query.filter_by(is_global=True).first()
            if not global_room:
                return create_error_response('Global room not found', 404)
            room_id = global_room.id
        
        # Check room permissions
        room = ChatRoom.query.get(room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        # For non-global rooms, check membership
        if not room.is_global:
            member = ChatRoomMember.query.filter_by(user_id=user_id, room_id=room_id).first()
            if not member:
                return create_error_response('You are not a member of this room', 403)
        
        # ✅ FIX: Validate content OR image_url
        if not content and not image_url:
            logger.warning("Empty content and image_url")
            return create_error_response('Content or image_url required', 400)
        
        # ✅ FIX: Only validate length if content exists
        if content and len(content) > 1000:
            logger.warning("Content too long")
            return create_error_response('Content too long (max 1000 characters)', 400)
        
        # ✅ FIX: Only validate image_url if it exists
        if image_url and not validate_image_url(image_url):
            logger.warning(f"Invalid image URL: {image_url}")
            return create_error_response('Invalid image URL (must be .png, .jpg, .jpeg, .gif, .webp)', 400)
        
        if parent_id:
            parent = Message.query.get(parent_id)
            if not parent or parent.is_deleted or parent.room_id != room_id:
                logger.warning(f"Parent message {parent_id} not found or invalid")
                return create_error_response('Parent message not found or invalid', 404)
        
        # ✅ Create message - content can be None if image_url exists
        message = Message(
            user_id=user_id,
            room_id=room_id,
            content=content,  # Can be None
            image_url=image_url,  # Can be None
            parent_id=parent_id,
            is_deleted=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        # ✅ QUAN TRỌNG: Refresh để load relationships
        db.session.refresh(message)
        message.user = user  # Đảm bảo user data được load
        
        # ✅ FIX: Broadcast message với đầy đủ data
        broadcast_new_message(message, user)
        
        if parent_id:
            broadcast_reply_added(parent_id, room_id)
        
        logger.info(f"✅ User {user_id} sent message {message.id} to room {room_id}")
        
        # ✅ FIX: Return message data với user info
        return jsonify({
            'status': 'success',
            'message': 'Message sent successfully',
            'message_data': message_to_dict(message),
            'room_id': room_id,
            'created_at': message.created_at.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error sending message by user {user_id}: {str(e)}")
        logger.error(f"   Error type: {type(e).__name__}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return create_error_response(str(e), 500)
# ============================================
# MEMBER: Update Own Message
# ============================================

@message_bp.route('/messages/<int:message_id>', methods=['PUT'])
@jwt_required()
def update_message(message_id):
    """Update own message - FIXED VERSION"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            return create_error_response('Account is banned', 403)
        
        message = Message.query.filter_by(id=message_id, user_id=user_id).first()
        if not message:
            return create_error_response('Message not found or unauthorized', 404)
        
        if message.is_deleted:
            return create_error_response('Cannot update deleted message', 400)
        
        data = request.get_json()
        if not data:
            return create_error_response('JSON data required', 400)
        
        # ✅ FIX: Safely get and sanitize
        raw_content = data.get('content')
        content = sanitize_input(raw_content.strip()) if raw_content else None
        
        raw_image_url = data.get('image_url')
        image_url = raw_image_url.strip() if raw_image_url else None
        
        # ✅ FIX: Validate content OR image_url
        if not content and not image_url:
            return create_error_response('Content or image_url required', 400)
        
        if content and len(content) > 1000:
            return create_error_response('Content too long (max 1000 characters)', 400)
        
        if image_url and not validate_image_url(image_url):
            return create_error_response('Invalid image URL', 400)
        
        # Update message
        message.content = content
        message.image_url = image_url
        message.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Broadcast update
        broadcast_message_updated(message)
        
        logger.info(f"User {user_id} updated message {message_id}")
        return jsonify({
            'status': 'success',
            'message': 'Message updated successfully',
            'message_data': message_to_dict(message)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating message {message_id} by user {user_id}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Delete Own Message với room support
# ============================================

@message_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Delete own message (soft delete) with real-time broadcast"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to delete message {message_id}")
            return create_error_response('Account is banned', 403)
        
        message = Message.query.filter_by(id=message_id, user_id=user_id).first()
        if not message:
            logger.warning(f"Message {message_id} not found or unauthorized for user {user_id}")
            return create_error_response('Message not found or unauthorized', 404)
        
        if message.is_deleted:
            logger.warning(f"Message {message_id} already deleted")
            return create_error_response('Message already deleted', 400)
        
        room_id = message.room_id
        parent_id = message.parent_id
        
        # Soft delete
        message.is_deleted = True
        message.updated_at = datetime.utcnow()
        db.session.commit()
        
        broadcast_message_deleted(message_id, room_id, deleted_by_admin=False)
        if parent_id:
            broadcast_reply_added(parent_id, room_id)
        
        logger.info(f"User {user_id} deleted message {message_id} from room {room_id}")
        return jsonify({
            'status': 'success',
            'message': 'Message deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting message {message_id} by user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# UPLOAD IMAGE FOR MESSAGES
# ============================================

@message_bp.route('/upload-image', methods=['POST'])
@jwt_required()
def upload_message_image():
    """Upload image for messages to Supabase"""
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

        # Validate file size (5MB max)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 5 * 1024 * 1024:
            return jsonify({"error": "File size must be less than 5MB"}), 400

        # Check Supabase client
        if supabase is None:
            logger.error("Supabase client is None in upload_message_image")
            return jsonify({"error": "Storage service not available"}), 503

        # Generate filename
        timestamp = int(time.time())
        file_name = f"message_{user_id}_{timestamp}.{file_ext}"
        file_path = f"message-images/{file_name}"

        logger.info(f"Uploading message image for user {user_id}: {file_path}")

        try:
            # Convert image to WebP format
            logger.info(f"Converting image to WebP format...")
            webp_content, webp_filename, success = convert_image_to_webp(file)
            
            if not success or webp_content is None:
                logger.error("Failed to convert image to WebP")
                return jsonify({"error": "Failed to process image"}), 400
            
            # Update filename and path for WebP
            file_name = f"message_{user_id}_{int(time.time())}.webp"
            file_path = f"message-images/{file_name}"
            
            # Upload to Supabase
            logger.info(f"Starting Supabase upload to {file_path}")
            result = supabase.storage.from_("user-assets").upload(
                file_path, 
                webp_content,
                {"content-type": "image/webp"}
            )

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

            logger.info(f"Message image uploaded successfully for user {user_id}")

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
        logger.error(f"Unexpected error in upload_message_image: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ============================================
# SOCKETIO EVENTS VỚI AUTHENTICATION
# ============================================

# backend/routes/message.py - FIXED SOCKETIO HANDLERS ONLY

def register_socketio_events(socketio_instance):
    """Register SocketIO events with JWT Authentication - FIXED"""
    
    @socketio_instance.on('connect', namespace='/chat')
    def handle_connect():
        """Client connects to chat"""
        try:
            logger.info("=" * 50)
            logger.info("🔌 SOCKET CONNECT ATTEMPT")
            logger.info(f"📡 Socket ID: {request.sid}")
            
            # ✅ AUTHENTICATE USER
            user = authenticate_socket_connection()
            if not user:
                logger.error("❌ AUTHENTICATION FAILED")
                emit('unauthorized', {
                    'message': 'Authentication failed',
                    'socket_id': request.sid
                }, namespace='/chat')
                return False
            
            # ✅ STORE USER INFO IN SESSION
            from flask import session
            import flask
            
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_role'] = user.role
            session.modified = True  # ✅ Mark session as modified to ensure persistence
            
            # ✅ Set session as permanent for SocketIO
            try:
                flask.session.permanent = True
            except:
                pass
            
            logger.info(f"✅ AUTHENTICATION SUCCESS - User: {user.username} (ID: {user.id})")
            logger.info(f"🔐 Session: user_id={session.get('user_id')}, modified={session.modified}")
            
            # ✅ Join user's personal room for notifications (invitations, etc.)
            join_room(f'user_{user.id}')
            logger.info(f"✅ Joined personal room: user_{user.id}")
            
            # ✅ AUTO-JOIN GLOBAL ROOM
            global_room = ChatRoom.query.filter_by(is_global=True).first()
            if global_room:
                join_room(str(global_room.id))
                # Track user in global room
                if global_room.id not in room_users:
                    room_users[global_room.id] = set()
                room_users[global_room.id].add(user.id)
                logger.info(f"✅ Auto-joined global room {global_room.id}")
                
                # Emit user_online for global room
                emit('user_online', {
                    'user_id': user.id,
                    'username': user.username,
                    'room_id': global_room.id,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/chat', room=str(global_room.id))
                logger.info(f"📢 Emitted user_online event for user {user.id} in global room {global_room.id}")
            
            emit('connected', {
                'message': f'Connected as {user.username}',
                'socket_id': request.sid,
                'user': {
                    'id': user.id,
                    'username': user.username
                }
            }, namespace='/chat')
            
            logger.info("✅ SOCKET CONNECTION COMPLETED")
            logger.info("=" * 50)
            return True
            
        except Exception as e:
            logger.error(f"❌ Socket connection error: {str(e)}")
            emit('error', {
                'message': 'Connection failed',
                'socket_id': request.sid
            }, namespace='/chat')
            return False
    
    @socketio_instance.on('disconnect', namespace='/chat')
    def handle_disconnect():
        """Client disconnects from chat"""
        try:
            from flask import session
            user_id = session.get('user_id')
            username = session.get('username')
            
            if user_id:
                # ✅ Get all rooms this user is in and emit offline events
                user = User.query.get(user_id)
                if user:
                    # Get all rooms where user is tracked
                    rooms_to_notify = [room_id for room_id, users in room_users.items() if user_id in users]
                    
                    # Emit offline event for each room and remove user from tracking
                    for room_id in rooms_to_notify:
                        # Remove user from room tracking
                        if room_id in room_users:
                            room_users[room_id].discard(user_id)
                            if len(room_users[room_id]) == 0:
                                del room_users[room_id]
                        
                        # Emit offline event
                        emit('user_offline', {
                            'user_id': user_id,
                            'username': user.username,
                            'room_id': room_id,
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/chat', room=str(room_id), include_self=False)
                        logger.info(f"📢 Emitted user_offline event for user {user_id} in room {room_id} on disconnect")
                
                logger.info(f"🔌 User {username} (ID: {user_id}) disconnected: {request.sid}")
            else:
                logger.info(f"🔌 Socket disconnected: {request.sid}")
        except Exception as e:
            logger.error(f"Error in disconnect handler: {str(e)}")
    
    @socketio_instance.on('join_room', namespace='/chat')
    def handle_join_room(data):
        """User joins a specific room - FIXED VERSION"""
        try:
            from flask import session
            import flask
            
            # Try to get user_id from session first
            user_id = session.get('user_id')
            
            logger.info("=" * 50)
            logger.info("🎯 JOIN_ROOM HANDLER CALLED")
            logger.info(f"👤 User ID from session: {user_id}")
            logger.info(f"📦 Data received: {data}")
            logger.info(f"🔐 Session keys: {list(session.keys())}")
            
            # If no user_id in session, try to authenticate
            if not user_id:
                logger.warning("⚠️ NO USER_ID IN SESSION - REAUTHENTICATING")
                user = authenticate_socket_connection()
                if not user:
                    logger.error("❌ REAUTHENTICATION FAILED")
                    emit('room_error', {
                        'message': 'Not authenticated', 
                        'room_id': data.get('room_id') if data else None
                    }, namespace='/chat')
                    return {'success': False, 'error': 'Not authenticated'}
                
                # ✅ CRITICAL: Set session and mark as modified
                user_id = user.id
                session['user_id'] = user.id
                session['username'] = user.username
                session['user_role'] = user.role
                session.modified = True  # ✅ Mark session as modified
                
                # ✅ Force session to persist
                try:
                    flask.session.permanent = True
                except:
                    pass
                
                logger.info(f"✅ REAUTHENTICATED: {user.username} (ID: {user_id})")
                logger.info(f"🔐 Session after auth: user_id={session.get('user_id')}")
            
            # ✅ GET ROOM_ID FROM DATA
            room_id = data.get('room_id')
            if not room_id:
                logger.error("❌ NO ROOM_ID PROVIDED")
                emit('room_error', {'message': 'Room ID required', 'room_id': None}, namespace='/chat')
                return {'success': False, 'error': 'Room ID required'}
            
            room_id = int(room_id)
            logger.info(f"🎯 Attempting to join room: {room_id}")
            
            # ✅ CHECK ROOM PERMISSIONS
            room = ChatRoom.query.get(room_id)
            if not room:
                logger.error(f"❌ ROOM {room_id} NOT FOUND")
                emit('room_error', {'message': 'Room not found', 'room_id': room_id}, namespace='/chat')
                return {'success': False, 'error': 'Room not found'}
            
            logger.info(f"✅ Room found: {room.name} (Global: {room.is_global})")
            
            # For non-global rooms, check membership
            if not room.is_global:
                member = ChatRoomMember.query.filter_by(user_id=user_id, room_id=room_id).first()
                if not member:
                    logger.error(f"❌ USER {user_id} NOT A MEMBER OF ROOM {room_id}")
                    emit('room_error', {'message': 'You are not a member of this room', 'room_id': room_id}, namespace='/chat')
                    return {'success': False, 'error': 'Not a member'}
                logger.info(f"✅ User is member with role: {member.role}")
            
            # ✅ Check if already in room (prevent duplicate joins)
            # This is handled by SocketIO, but we log it
            logger.info(f"🔌 Joining SocketIO room: {room_id}")
            join_room(str(room_id))
            logger.info(f"✅ User {user_id} successfully JOINED room {room_id}")
            
            # ✅ Ensure session is persisted
            session.modified = True
            
            # ✅ Get list of currently online users in this room (excluding self) BEFORE adding current user
            online_user_ids = list(room_users.get(room_id, set()) - {user_id})
            
            # ✅ Track user in room (after getting online users list)
            if room_id not in room_users:
                room_users[room_id] = set()
            room_users[room_id].add(user_id)
            
            # ✅ SEND CONFIRMATION with list of online users
            user = User.query.get(user_id)
            if user:
                # Get online users info
                online_users_info = []
                for online_user_id in online_user_ids:
                    online_user = User.query.get(online_user_id)
                    if online_user:
                        online_users_info.append({
                            'user_id': online_user.id,
                            'username': online_user.username
                        })
                
                emit('room_joined', {
                    'room_id': room_id,
                    'room_name': room.name,
                    'message': f'Joined {room.name}',
                    'online_users': online_users_info
                }, namespace='/chat')
                
                # ✅ EMIT USER ONLINE EVENT to all users in the room (so they see this user)
                emit('user_online', {
                    'user_id': user_id,
                    'username': user.username,
                    'room_id': room_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/chat', room=str(room_id))
                logger.info(f"📢 Emitted user_online event for user {user_id} in room {room_id}")
            
            logger.info(f"📢 Sent room_joined event for room {room_id} with {len(online_user_ids)} online users")
            logger.info("=" * 50)
            
            return {'success': True, 'room_id': room_id, 'room_name': room.name}
            
        except Exception as e:
            logger.error(f"❌ Error joining room: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            room_id = data.get('room_id') if 'data' in locals() else None
            if room_id:
                room_id = int(room_id)
            emit('room_error', {'message': f'Failed to join room: {str(e)}', 'room_id': room_id}, namespace='/chat')
            return {'success': False, 'error': str(e)}
    
    @socketio_instance.on('leave_room', namespace='/chat')
    def handle_leave_room(data):
        """User leaves a room"""
        try:
            from flask import session
            user_id = session.get('user_id')
            room_id = data.get('room_id')
            
            if not user_id:
                return
            
            if not room_id:
                emit('error', {'message': 'Room ID required'}, namespace='/chat')
                return
            
            # ✅ EMIT USER OFFLINE EVENT before leaving
            user = User.query.get(user_id)
            if user:
                emit('user_offline', {
                    'user_id': user_id,
                    'username': user.username,
                    'room_id': room_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/chat', room=str(room_id), include_self=False)
                logger.info(f"📢 Emitted user_offline event for user {user_id} in room {room_id}")
            
            # ✅ Remove user from room tracking
            if room_id in room_users:
                room_users[room_id].discard(user_id)
                if len(room_users[room_id]) == 0:
                    del room_users[room_id]
            
            leave_room(str(room_id))
            
            emit('room_left', {
                'room_id': room_id,
                'message': 'Left room'
            }, namespace='/chat')
            
            logger.info(f"User {session.get('username')} left room {room_id}")
            
        except Exception as e:
            logger.error(f"Error leaving room: {str(e)}")
    
    @socketio_instance.on('send_message', namespace='/chat')
    def handle_send_message(data):
        """Send message via socket - FIXED VERSION"""
        try:
            from flask import session
            user_id = session.get('user_id')
            
            if not user_id:
                emit('unauthorized', {'message': 'Not authenticated'}, namespace='/chat')
                return {'success': False, 'error': 'Not authenticated'}
            
            room_id = data.get('room_id')
            
            # ✅ FIX: Safely get content and image_url
            raw_content = data.get('content')
            content = raw_content.strip() if raw_content else None
            
            raw_image_url = data.get('image_url')
            image_url = raw_image_url.strip() if raw_image_url else None
            
            parent_id = data.get('parent_id')
            
            if not room_id:
                emit('error', {'message': 'Room ID required'}, namespace='/chat')
                return {'success': False, 'error': 'Room ID required'}
            
            # ✅ VALIDATE ROOM MEMBERSHIP
            room = ChatRoom.query.get(room_id)
            if not room:
                emit('error', {'message': 'Room not found'}, namespace='/chat')
                return {'success': False, 'error': 'Room not found'}
            
            if not room.is_global:
                member = ChatRoomMember.query.filter_by(user_id=user_id, room_id=room_id).first()
                if not member:
                    emit('error', {'message': 'You are not a member of this room'}, namespace='/chat')
                    return {'success': False, 'error': 'Not a member'}
            
            # ✅ VALIDATE MESSAGE CONTENT
            if not content and not image_url:
                emit('error', {'message': 'Message content or image required'}, namespace='/chat')
                return {'success': False, 'error': 'Content required'}
            
            if content and len(content) > 1000:
                emit('error', {'message': 'Message too long'}, namespace='/chat')
                return {'success': False, 'error': 'Message too long'}
            
            # ✅ CREATE MESSAGE IN DATABASE
            user = User.query.get(user_id)
            message = Message(
                user_id=user_id,
                room_id=room_id,
                content=content,
                image_url=image_url,
                parent_id=parent_id,
                is_deleted=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.session.add(message)
            db.session.commit()
            db.session.refresh(message)
            
            # ✅ BROADCAST MESSAGE TO ROOM
            message_data = message_to_dict(message)
            emit('new_message', message_data, 
                namespace='/chat', room=str(room_id))
            
            # Update reply count if it's a reply
            if parent_id:
                broadcast_reply_added(parent_id, room_id)
            
            logger.info(f"✅ User {user.username} sent message to room {room_id} via socket")
            
            return {'success': True, 'message': message_data}
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error sending message via socket: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            emit('error', {'message': 'Failed to send message'}, namespace='/chat')
            return {'success': False, 'error': str(e)}
    @socketio_instance.on('typing', namespace='/chat')
    def handle_typing(data):
        """User is typing in a room"""
        try:
            from flask import session
            user_id = session.get('user_id')
            room_id = data.get('room_id')
            is_typing = data.get('is_typing', False)
            
            if not user_id or not room_id:
                return
                
            emit('user_typing', {
                'user_id': user_id,
                'username': session.get('username', 'Unknown'),
                'room_id': room_id,
                'is_typing': is_typing,
                'timestamp': datetime.utcnow().isoformat()
            }, namespace='/chat', room=str(room_id), include_self=False)
            
        except Exception as e:
            logger.error(f"Error handling typing: {str(e)}")
# ============================================
# ADMIN: Message Management
# ============================================

@message_bp.route('/admin/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_message(message_id):
    """Admin delete any message"""
    try:
        admin_id = get_jwt_identity()
        
        message = Message.query.get(message_id)
        if not message:
            return create_error_response('Message not found', 404)
        
        if message.is_deleted:
            return create_error_response('Message already deleted', 400)
        
        room_id = message.room_id
        parent_id = message.parent_id
        
        # Soft delete
        message.is_deleted = True
        message.updated_at = datetime.utcnow()
        db.session.commit()
        
        broadcast_message_deleted(message_id, room_id, deleted_by_admin=True)
        if parent_id:
            broadcast_reply_added(parent_id, room_id)
        
        logger.info(f"Admin {admin_id} deleted message {message_id} from room {room_id}")
        return jsonify({
            'status': 'success',
            'message': 'Message deleted by admin'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error admin deleting message {message_id}: {str(e)}")
        return create_error_response(str(e), 500)
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.extensions import db

from backend.models.user import User
from backend.models.user_preference import UserPreference
from backend.models.book_rating import BookRating
from backend.models.reading_history import ReadingHistory
from backend.models.book import Book
from backend.models.category import Category
from backend.middleware.auth_middleware import admin_required, sanitize_input, validate_username, validate_email
from backend.utils.error_handler import create_error_response
from datetime import datetime
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)
user_bp = Blueprint('user', __name__)

# Helper function to serialize user data
def user_to_dict(user, include_sensitive=False):
    """Convert User object to dict with optional sensitive info"""
    data = {
        'id': user.id,
        'username': user.username,
        'avatar_url': user.avatar_url or '',
        'role': user.role,
        'is_banned': user.is_banned,
        'created_at': user.created_at.isoformat() if user.created_at else None
    }
    if include_sensitive:
        data['email'] = user.email
    return data

# ============================================
# MEMBER: Profile
# ============================================

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """View user profile"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user accessed profile: {user_id}")
            return create_error_response('Account is banned', 403)
        
        logger.info(f"User {user_id} retrieved profile")
        return jsonify({
            'status': 'success',
            'user': user_to_dict(user, include_sensitive=True)
        }), 200
        
    except Exception as e:
        logger.error(f"Get profile error for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to update profile: {user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        # Update username
        if 'username' in data:
            new_username = sanitize_input(data['username'].strip())
            is_valid, message = validate_username(new_username)
            if not is_valid:
                logger.warning(f"Invalid username: {new_username} - {message}")
                return create_error_response(message, 400)
            if new_username != user.username:
                existing = User.query.filter_by(username=new_username).first()
                if existing:
                    logger.warning(f"Username already exists: {new_username}")
                    return create_error_response('Username already exists', 409)
                user.username = new_username
        
        # Update email
        if 'email' in data:
            new_email = sanitize_input(data['email'].strip().lower())
            is_valid, message = validate_email(new_email)
            if not is_valid:
                logger.warning(f"Invalid email: {new_email} - {message}")
                return create_error_response(message, 400)
            if new_email != user.email:
                existing = User.query.filter_by(email=new_email).first()
                if existing:
                    logger.warning(f"Email already exists: {new_email}")
                    return create_error_response('Email already exists', 409)
                user.email = new_email
        
        # Update avatar_url
        if 'avatar_url' in data:
            avatar_url = data['avatar_url'].strip()
            if avatar_url:
                try:
                    parsed = urlparse(avatar_url)
                    if not parsed.scheme or not parsed.netloc:
                        logger.warning(f"Invalid avatar URL: {avatar_url}")
                        return create_error_response('Invalid avatar URL', 400)
                    # Basic image URL validation
                    if not avatar_url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                        logger.warning(f"Avatar URL is not an image: {avatar_url}")
                        return create_error_response('Avatar URL must be an image (png, jpg, jpeg, gif)', 400)
                except Exception:
                    logger.warning(f"Invalid avatar URL format: {avatar_url}")
                    return create_error_response('Invalid avatar URL format', 400)
            user.avatar_url = avatar_url or None
        
        db.session.commit()
        
        logger.info(f"User {user_id} updated profile")
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'user': user_to_dict(user, include_sensitive=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        if 'unique' in str(e).lower():
            logger.warning(f"Unique constraint violation: {str(e)}")
            return create_error_response('Username or email already exists', 409)
        logger.error(f"Update profile error for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Favorite Categories
# ============================================

@user_bp.route('/favorites', methods=['POST'])
@jwt_required()
def add_favorite():
    """Add favorite category to user_preferences"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to add favorite category: {user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        category_id = data.get('category_id')
        if not category_id:
            logger.warning("Missing category_id")
            return create_error_response('category_id required', 400)
        
        category = Category.query.get(category_id)
        if not category:
            logger.warning(f"Category not found: {category_id}")
            return create_error_response('Category not found', 404)
        
        # Limit number of favorite categories (e.g., max 10)
        if UserPreference.query.filter_by(user_id=user_id).count() >= 10:
            logger.warning(f"User {user_id} exceeded favorite category limit")
            return create_error_response('Maximum favorite categories reached (10)', 400)
        
        existing = UserPreference.query.filter_by(
            user_id=user_id,
            category_id=category_id
        ).first()
        
        if existing:
            logger.info(f"Category {category_id} already in favorites for user {user_id}")
            return jsonify({
                'status': 'success',
                'message': 'Category already in favorites'
            }), 200
        
        pref = UserPreference(
            user_id=user_id,
            category_id=category_id,
            is_notification_enable=data.get('is_notification_enable', False)
        )
        
        db.session.add(pref)
        db.session.commit()
        
        logger.info(f"User {user_id} added favorite category {category_id}")
        return jsonify({
            'status': 'success',
            'message': 'Favorite category added',
            'category': {
                'id': category.id,
                'name': category.name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding favorite category for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/favorites/<int:category_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(category_id):
    """Remove favorite category"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to remove favorite category: {user_id}")
            return create_error_response('Account is banned', 403)
        
        pref = UserPreference.query.filter_by(
            user_id=user_id,
            category_id=category_id
        ).first()
        
        if not pref:
            logger.warning(f"Favorite category {category_id} not found for user {user_id}")
            return create_error_response('Favorite category not found', 404)
        
        db.session.delete(pref)
        db.session.commit()
        
        logger.info(f"User {user_id} removed favorite category {category_id}")
        return jsonify({
            'status': 'success',
            'message': 'Favorite category removed'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing favorite category {category_id} for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """Get user's favorite categories"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get favorites: {user_id}")
            return create_error_response('Account is banned', 403)
        
        prefs = UserPreference.query.filter_by(user_id=user_id)\
            .options(db.joinedload(UserPreference.category))\
            .all()
        
        result = [{
            'category_id': pref.category_id,
            'category_name': pref.category.name,
            'is_notification_enable': pref.is_notification_enable
        } for pref in prefs if pref.category]
        
        logger.info(f"Retrieved {len(result)} favorite categories for user {user_id}")
        return jsonify({
            'status': 'success',
            'favorites': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching favorite categories for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Like Book (Rating=5)
# ============================================

@user_bp.route('/<int:book_id>/like', methods=['POST'])
@jwt_required()
def like_book(book_id):
    """Like a book (set rating=5 in book_ratings)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to like book: {user_id}")
            return create_error_response('Account is banned', 403)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        existing = BookRating.query.filter_by(
            user_id=user_id,
            book_id=book_id
        ).first()
        
        if existing:
            existing.rating = 5
            existing.review = ''
            existing.updated_at = datetime.utcnow()
        else:
            rating = BookRating(
                user_id=user_id,
                book_id=book_id,
                rating=5,
                review='',
                created_at=datetime.utcnow()
            )
            db.session.add(rating)
        
        db.session.commit()
        
        logger.info(f"User {user_id} liked book {book_id}")
        return jsonify({
            'status': 'success',
            'message': 'Book liked'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error liking book {book_id} for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/<int:book_id>/like', methods=['DELETE'])
@jwt_required()
def unlike_book(book_id):
    """Unlike a book (remove from book_ratings)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to unlike book: {user_id}")
            return create_error_response('Account is banned', 403)
        
        rating = BookRating.query.filter_by(
            user_id=user_id,
            book_id=book_id
        ).first()
        
        if not rating:
            logger.warning(f"Like not found for book {book_id} by user {user_id}")
            return create_error_response('Like not found', 404)
        
        db.session.delete(rating)
        db.session.commit()
        
        logger.info(f"User {user_id} unliked book {book_id}")
        return jsonify({
            'status': 'success',
            'message': 'Book unliked'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unliking book {book_id} for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Reading History
# ============================================

@user_bp.route('/history', methods=['GET'])
@jwt_required()
def get_reading_history():
    """Get reading history with pagination"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get reading history: {user_id}")
            return create_error_response('Account is banned', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        history_query = ReadingHistory.query.filter_by(user_id=user_id)\
            .options(db.joinedload(ReadingHistory.book).joinedload(Book.authors))\
            .order_by(ReadingHistory.last_read_at.desc())
        
        paginated = history_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for h in paginated.items:
            book = h.book
            if book:
                result.append({
                    'book_id': book.id,
                    'title': book.title,
                    'cover_image': book.cover_image or '',
                    'authors': [a.to_dict() for a in book.authors],
                    'last_page': h.last_page,
                    'last_read_at': h.last_read_at.isoformat() if h.last_read_at else None
                })
        
        logger.info(f"Retrieved {len(result)} reading history entries for user {user_id}")
        return jsonify({
            'status': 'success',
            'history': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching reading history for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: Ban/Unban User
# ============================================

@user_bp.route('/<int:user_id>/ban', methods=['PUT'])
@admin_required
def ban_user(user_id):
    """Ban a user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if str(user_id) == current_user_id:
            logger.warning(f"Admin {current_user_id} attempted to ban self")
            return create_error_response('Cannot ban yourself', 400)
        
        if user.role == 'admin':
            logger.warning(f"Admin {current_user_id} attempted to ban another admin {user_id}")
            return create_error_response('Cannot ban another admin', 403)
        
        if user.is_banned:
            logger.info(f"User {user_id} already banned")
            return jsonify({
                'status': 'success',
                'message': f'User {user.username} is already banned'
            }), 200
        
        user.is_banned = True
        db.session.commit()
        
        logger.info(f"User {user_id} banned by admin {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': f'User {user.username} banned successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error banning user {user_id} by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/<int:user_id>/unban', methods=['PUT'])
@admin_required
def unban_user(user_id):
    """Unban a user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if not user.is_banned:
            logger.info(f"User {user_id} is not banned")
            return jsonify({
                'status': 'success',
                'message': f'User {user.username} is not banned'
            }), 200
        
        user.is_banned = False
        db.session.commit()
        
        logger.info(f"User {user_id} unbanned by admin {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': f'User {user.username} unbanned successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unbanning user {user_id} by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: List Users
# ============================================

@user_bp.route('/', methods=['GET'])
@admin_required
def list_users():
    """List all users with pagination (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = sanitize_input(request.args.get('search', ''))  # Sanitize search input
        
        query = User.query
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        query = query.order_by(User.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = [user_to_dict(user, include_sensitive=True) for user in paginated.items]
        
        logger.info(f"Admin {current_user_id} retrieved {len(result)} users")
        return jsonify({
            'status': 'success',
            'users': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing users by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)
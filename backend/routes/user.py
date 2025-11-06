from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from sqlalchemy import or_  # Thêm import này ở đầu file
from models.user import User
from models.user_preference import UserPreference
from models.book_rating import BookRating
from models.reading_history import ReadingHistory
from models.view_history import ViewHistory 
from models.book import Book
from models.category import Category
from models.favorite import Favorite
from sqlalchemy.orm import joinedload
from middleware.auth_middleware import admin_required, sanitize_input, validate_username, validate_email
from utils.error_handler import create_error_response
from datetime import datetime
from urllib.parse import urlparse
import logging

import time  
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
user_bp = Blueprint('user', __name__)

# Supabase configuration
def get_supabase():
    from supabase import create_client
    url = "https://vcqhwonimqsubvqymgjx.supabase.co"
    key = os.getenv("SUPABASE_SERVICE_ROLE")
    return create_client(url, key)



# Helper function to serialize user data
def user_to_dict(user, include_sensitive=False):
    """Convert User object to dict with optional sensitive info"""
    data = {
        'id': user.id,
        'username': user.username,
        'avatar_url': user.avatar_url or '',
        'role': user.role,
        'is_banned': user.is_banned,
        'name': user.name or '',
        'bio': user.bio or '',
        'favorite_books': user.favorite_books or '',
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
            avatar_url = data['avatar_url']
            
            # Nếu avatar_url là null, empty string hoặc undefined
            if not avatar_url:
                user.avatar_url = None
            else:
                avatar_url = avatar_url.strip()
                try:
                    parsed = urlparse(avatar_url)
                    
                    # Kiểm tra nếu là URL hợp lệ
                    if not parsed.scheme or not parsed.netloc:
                        logger.warning(f"Invalid avatar URL: {avatar_url}")
                        return create_error_response('Invalid avatar URL', 400)
                    
                    # Cho phép cả Supabase URLs và các image hosting khác
                    # Supabase URLs thường chứa 'supabase.co'
                    if 'supabase.co' not in parsed.netloc:
                        logger.info(f"Avatar URL is not from Supabase, but allowing: {avatar_url}")
                        # Vẫn cho phép các image hosting khác, chỉ cần là URL hợp lệ
                        
                    # Mở rộng định dạng ảnh được cho phép
                    allowed_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')
                    if not any(avatar_url.lower().endswith(ext) for ext in allowed_extensions):
                        logger.warning(f"Avatar URL is not an image: {avatar_url}")
                        return create_error_response('Avatar URL must be an image (png, jpg, jpeg, gif, webp, svg)', 400)
                        
                except Exception as e:
                    logger.warning(f"Invalid avatar URL format: {avatar_url} - {str(e)}")
                    return create_error_response('Invalid avatar URL format', 400)
                    
                user.avatar_url = avatar_url
        
        # Update name
        if 'name' in data:
            user.name = sanitize_input(data['name'].strip()) if data['name'] else None
        
        # Update bio
        if 'bio' in data:
            user.bio = sanitize_input(data['bio'].strip()) if data['bio'] else None
        
        # Update favorite_books
        if 'favorite_books' in data:
            user.favorite_books = sanitize_input(data['favorite_books'].strip()) if data['favorite_books'] else None
        
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

@user_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to change password: {user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password:
            return create_error_response('Current password is required', 400)
        
        if not new_password:
            return create_error_response('New password is required', 400)
        
        if len(new_password) < 6:
            return create_error_response('New password must be at least 6 characters', 400)
        
        # Verify current password
        if not user.check_password(current_password):
            logger.warning(f"Invalid current password for user {user_id}")
            return create_error_response('Current password is incorrect', 401)
        
        # Check if new password is same as current
        if user.check_password(new_password):
            return create_error_response('New password must be different from current password', 400)
        
        # Set new password
        user.set_password(new_password)
        db.session.commit()
        
        logger.info(f"User {user_id} changed password successfully")
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Change password error for user {user_id}: {str(e)}")
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
@user_bp.route('/history/today', methods=['GET'])
@jwt_required()
def get_today_reading_history():
    """Get books viewed today (from view_history table)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get today's reading history: {user_id}")
            return create_error_response('Account is banned', 403)
        
        today = datetime.utcnow().date()
        
        # ✅ DÙNG ViewHistory để lấy sách đã XEM
        today_views = ViewHistory.query.filter_by(user_id=user_id)\
            .filter(db.func.date(ViewHistory.viewed_at) == today)\
            .order_by(ViewHistory.viewed_at.desc())\
            .all()
        
        result = []
        seen_books = set()  # Tránh trùng lặp
        
        for view in today_views:
            if view.book_id in seen_books:
                continue
            seen_books.add(view.book_id)
            
            book = Book.query.get(view.book_id)
            if book:
                # Lấy last_page từ ReadingHistory nếu có
                reading = ReadingHistory.query.filter_by(
                    user_id=user_id, 
                    book_id=view.book_id
                ).first()
                
                result.append({
                    'book_id': book.id,
                    'title': book.title,
                    'cover_image': book.cover_image or '',
                    'authors': [a.to_dict() for a in book.authors],
                    'last_page': reading.last_page if reading else 0,
                    'last_read_at': view.viewed_at.isoformat(),
                    'read_today': True
                })
        
        logger.info(f"Retrieved {len(result)} today's viewed books for user {user_id}")
        return jsonify({
            'status': 'success',
            'history': result,
            'date': today.isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching today's reading history for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)
@user_bp.route('/history/books-all', methods=['GET'])
@jwt_required()
def get_reading_history():
    """Get all viewing history with pagination (from view_history table)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get reading history: {user_id}")
            return create_error_response('Account is banned', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # ✅ DÙNG ViewHistory
        # Lấy view mới nhất của mỗi sách (DISTINCT ON book_id)
        subquery = db.session.query(
            ViewHistory.book_id,
            db.func.max(ViewHistory.viewed_at).label('latest_view')
        ).filter_by(user_id=user_id)\
         .group_by(ViewHistory.book_id)\
         .subquery()
        
        history_query = db.session.query(ViewHistory)\
            .join(subquery, db.and_(
                ViewHistory.book_id == subquery.c.book_id,
                ViewHistory.viewed_at == subquery.c.latest_view
            ))\
            .filter(ViewHistory.user_id == user_id)\
            .order_by(ViewHistory.viewed_at.desc())
        
        paginated = history_query.paginate(page=page, per_page=per_page, error_out=False)
        
        today = datetime.utcnow().date()
        result = []
        
        for view in paginated.items:
            book = Book.query.get(view.book_id)
            if book:
                read_date = view.viewed_at.date() if view.viewed_at else None
                is_today = read_date == today
                
                # Lấy last_page từ ReadingHistory
                reading = ReadingHistory.query.filter_by(
                    user_id=user_id, 
                    book_id=view.book_id
                ).first()
                
                result.append({
                    'book_id': book.id,
                    'title': book.title,
                    'cover_image': book.cover_image or '',
                    'authors': [a.to_dict() for a in book.authors],
                    'last_page': reading.last_page if reading else 0,
                    'last_read_at': view.viewed_at.isoformat(),
                    'read_today': is_today
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


@user_bp.route('/<username>/profile', methods=['GET'])
def get_public_profile(username):
    """Get public user profile by username"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            logger.warning(f"User not found: {username}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Attempted to access banned user profile: {username}")
            return create_error_response('User account is banned', 403)
        
        # Chỉ trả về thông tin public, không có email
        logger.info(f"Retrieved public profile for user: {username}")
        return jsonify({
            'status': 'success',
            'user': user_to_dict(user, include_sensitive=False)
        }), 200
        
    except Exception as e:
        logger.error(f"Get public profile error for user {username}: {str(e)}")
        return create_error_response(str(e), 500)

@user_bp.route('/<username>/favorites', methods=['GET'])
def get_user_favorites(username):
    """Get public user's favorite books by username"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            logger.warning(f"User not found: {username}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Attempted to access banned user favorites: {username}")
            return create_error_response('User account is banned', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        favorites_query = Favorite.query.filter_by(user_id=user.id)\
            .options(joinedload(Favorite.book).joinedload(Book.category))\
            .order_by(Favorite.created_at.desc())
        
        paginated = favorites_query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Import book_to_dict from book routes
        from routes.book import book_to_dict
        
        result = []
        for favorite in paginated.items:
            if not favorite.book:
                continue
                
            try:
                # For public view, don't pass current_user_id (no auth required)
                book_dict = book_to_dict(favorite.book, include_details=True, current_user_id=None)
                result.append({
                    'id': favorite.id,
                    'book': book_dict,
                    'added_at': favorite.created_at.isoformat() if favorite.created_at else None
                })
            except Exception as e:
                logger.error(f"Error processing favorite {favorite.id} for book {favorite.book_id}: {str(e)}")
                continue
        
        logger.info(f"Retrieved {len(result)} favorite books for user: {username}")
        return jsonify({
            'status': 'success',
            'favorites': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get user favorites error for user {username}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# USER SEARCH (for adding members)
# ============================================

@user_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    """Search users by username (for adding to rooms)"""
    try:
        current_user_id = get_jwt_identity()
        query = sanitize_input(request.args.get('q', '').strip())
        limit = request.args.get('limit', 10, type=int)
        
        if not query or len(query) < 2:
            return jsonify({
                'status': 'success',
                'suggestions': []
            }), 200
        
        # Search users by username (excluding banned users)
        search_term = f'%{query}%'
        users_query = User.query.filter(
            User.username.ilike(search_term),
            User.is_banned == False,
            User.id != current_user_id  # Exclude current user
        ).order_by(User.username.asc()).limit(limit)
        
        users = users_query.all()
        
        suggestions = [
            {
                'id': user.id,
                'username': user.username,
                'avatar_url': user.avatar_url or '',
            }
            for user in users
        ]
        
        logger.info(f"User {current_user_id} searched for: '{query}', found {len(suggestions)} users")
        
        return jsonify({
            'status': 'success',
            'suggestions': suggestions,
            'count': len(suggestions),
            'query': query
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        return create_error_response(str(e), 500)
    




@user_bp.route('/upload-avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    """Upload avatar to Supabase with detailed error handling"""
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
            logger.error("Supabase client is None in upload_avatar")
            return jsonify({"error": "Storage service not available"}), 503

        # Generate filename
        timestamp = int(time.time())
        file_name = f"{user_id}_{timestamp}.{file_ext}"
        file_path = f"avatars/{file_name}"

        logger.info(f"Uploading avatar for user {user_id}: {file_path}")

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

            # Check result - FIXED: use proper error checking
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
                    "error": "Failed to generate avatar URL",
                    "debug": str(url_error)
                }), 500

            # Update user in database
            user.avatar_url = public_url
            db.session.commit()

            logger.info(f"Avatar updated successfully for user {user_id}")

            return jsonify({
                "status": "success",
                "message": "Avatar uploaded successfully",
                "avatar_url": public_url,
                "user": user_to_dict(user, include_sensitive=True)
            }), 200

        except Exception as upload_error:
            logger.error(f"Upload process error: {str(upload_error)}")
            return jsonify({
                "error": "Upload failed",
                "debug": str(upload_error)
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in upload_avatar: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@user_bp.route('/avatar', methods=['DELETE'])
@jwt_required()
def delete_avatar():
    """Remove user avatar"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return create_error_response("User not found", 404)

        if user.is_banned:
            return create_error_response('Account is banned', 403)

        if not user.avatar_url:
            return jsonify({
                "status": "success",
                "message": "No avatar to remove"
            }), 200

        # Extract filename from URL for Supabase deletion (optional)
        # You can choose to keep the file in storage or delete it
        # For now, we'll just remove the reference
        
        user.avatar_url = None
        db.session.commit()

        logger.info(f"Avatar removed for user {user_id}")

        return jsonify({
            "status": "success",
            "message": "Avatar removed successfully",
            "user": user_to_dict(user, include_sensitive=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing avatar for user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)
@user_bp.route('/test-supabase-connection', methods=['GET'])
def test_supabase_connection():
    """Test Supabase connection in detail"""
    try:
        if supabase is None:
            return jsonify({
                "status": "error",
                "message": "Supabase client is None",
                "debug": {
                    "url": SUPABASE_URL,
                    "key_set": bool(SUPABASE_SERVICE_ROLE),
                    "key_type": "service_role"
                }
            }), 500
        
        # Test multiple endpoints
        tests = {}
        
        # Test 1: Storage
        try:
            buckets = supabase.storage.list_buckets()
            tests["storage"] = {
                "status": "success",
                "buckets": [b.name for b in buckets]
            }
        except Exception as e:
            tests["storage"] = {
                "status": "error", 
                "message": str(e)
            }
        
        # Test 2: Auth
        try:
            users = supabase.auth.admin.list_users()
            tests["auth"] = {
                "status": "success",
                "user_count": len(users)
            }
        except Exception as e:
            tests["auth"] = {
                "status": "error",
                "message": str(e)
            }
            
        return jsonify({
            "status": "success" if all(t["status"] == "success" for t in tests.values()) else "partial",
            "tests": tests,
            "client_initialized": True
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Test failed: {str(e)}"
        }), 500
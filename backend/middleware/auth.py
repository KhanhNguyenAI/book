from functools import wraps
from flask import request, jsonify, g
import logging
import jwt  # Giả định dùng PyJWT
from utils.db import fetch_one

logger = logging.getLogger(__name__)

def get_current_user():
    """Get current user from JWT token"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        logger.debug("No Authorization header provided")
        return None
    
    try:
        if not auth_header.startswith('Bearer '):
            logger.debug("Invalid Authorization header format")
            return None
            
        token = auth_header[7:]
        try:
            payload = verify_access_token(token)
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
            
        user_id = payload.get('user_id')
        if not user_id:
            logger.warning("No user_id in token payload")
            return None
            
        # Get user from database (Neon DB, PostgreSQL)
        user = fetch_one(
            "SELECT id, username, email, role, is_banned, avatar_url, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        
        if not user:
            logger.warning(f"No user found for user_id: {user_id}")
            return None
            
        # Đảm bảo is_banned là boolean
        user['is_banned'] = user.get('is_banned', False)
        
        logger.debug(f"User authenticated: {user['username']} (ID: {user_id})")
        return user
        
    except Exception as e:
        logger.error(f"Authentication error for token: {token[:10]}... - {str(e)}")
        return None

def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        
        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 401
        
        if user['is_banned']:
            logger.info(f"Banned user attempted access: {user['username']} (ID: {user['id']})")
            return jsonify({
                "status": "error",
                "message": "Account is banned"
            }), 403
        
        # Add user info to Flask global context
        g.user_id = user['id']
        g.username = user['username']
        g.user_role = user['role']
        g.user_email = user['email']
        g.user = user
        
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        
        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 401
        
        if user['is_banned']:
            logger.info(f"Banned admin attempted access: {user['username']} (ID: {user['id']})")
            return jsonify({
                "status": "error",
                "message": "Account is banned"
            }), 403
        
        if user['role'] != 'admin':
            logger.info(f"Non-admin user attempted admin access: {user['username']} (ID: {user['id']})")
            return jsonify({
                "status": "error",
                "message": "Admin access required"
            }), 403
        
        # Add user info to Flask global context
        g.user_id = user['id']
        g.username = user['username']
        g.user_role = user['role']
        g.user_email = user['email']
        g.user = user
        
        return f(*args, **kwargs)
    return decorated_function

def optional_login(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        
        if user and not user['is_banned']:
            g.user_id = user['id']
            g.username = user['username']
            g.user_role = user['role']
            g.user_email = user['email']
            g.user = user
            logger.debug(f"Optional login - User authenticated: {user['username']} (ID: {user['id']})")
        else:
            g.user_id = None
            g.username = None
            g.user_role = None
            g.user_email = None
            g.user = None
            logger.debug("Optional login - No valid user")
        
        return f(*args, **kwargs)
    return decorated_function
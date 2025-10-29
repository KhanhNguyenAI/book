from flask import request, g
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request
from functools import wraps
from backend.models.user import User

from backend.utils.error_handler import create_error_response
import re
import bcrypt
from datetime import datetime, timedelta
import jwt
import logging
from tenacity import retry, stop_after_attempt, wait_fixed

logger = logging.getLogger(__name__)

# Password hashing and verification
def hash_password(password):
    """
    Hash a password using bcrypt
    """
    try:
        if not password:
            raise ValueError("Password cannot be empty")
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        logger.debug("Password hashed successfully")
        return hashed_password.decode('utf-8')
    except Exception as e:
        logger.error(f"Error hashing password: {str(e)}")
        raise ValueError(f"Error hashing password: {str(e)}")

def verify_password(password, hashed_password):
    """
    Verify a password against its hash
    """
    try:
        if not password or not hashed_password:
            logger.warning("Empty password or hashed_password provided")
            return False
        result = bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        logger.debug(f"Password verification {'successful' if result else 'failed'}")
        return result
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

def validate_password_strength(password):
    """
    Validate password strength
    Requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter  
    - At least 1 number
    - At least 1 special character
    """
    if not password:
        logger.warning("Password validation: Empty password")
        return False, "Password is required"
    
    if len(password) < 8:
        logger.warning("Password validation: Too short")
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        logger.warning("Password validation: No uppercase letter")
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        logger.warning("Password validation: No lowercase letter")
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'[0-9]', password):
        logger.warning("Password validation: No number")
        return False, "Password must contain at least one number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        logger.warning("Password validation: No special character")
        return False, "Password must contain at least one special character"
    
    logger.debug("Password validation: Strong password")
    return True, "Password is strong"

def validate_email(email):
    """
    Validate email format
    """
    if not email:
        logger.warning("Email validation: Empty email")
        return False, "Email is required"
    
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        logger.warning(f"Email validation failed: {email}")
        return False, "Invalid email format"
    
    logger.debug(f"Email validation successful: {email}")
    return True, "Email is valid"

def validate_username(username):
    """
    Validate username format
    Requirements:
    - 3-20 characters
    - Only letters, numbers, underscores, and hyphens
    - Cannot start or end with special characters
    """
    if not username:
        logger.warning("Username validation: Empty username")
        return False, "Username is required"
    
    if len(username) < 3 or len(username) > 20:
        logger.warning(f"Username validation: Invalid length - {username}")
        return False, "Username must be between 3 and 20 characters"
    
    if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$', username):
        logger.warning(f"Username validation: Invalid format - {username}")
        return False, "Username can only contain letters, numbers, underscores, and hyphens"
    
    logger.debug(f"Username validation successful: {username}")
    return True, "Username is valid"

# Authentication middleware helper
@retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
def _check_user_access(required_roles=None):
    """
    Helper function to check user authentication and authorization with retry
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id} at {request.remote_addr} for {request.path}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user attempted access: {user_id} at {request.remote_addr} for {request.path}")
            return create_error_response('User is banned', 403)
        
        if required_roles and user.role not in required_roles:
            logger.info(f"Unauthorized role access: {user.role} (required: {required_roles}) at {request.remote_addr} for {request.path}")
            return create_error_response(f"{', '.join(required_roles)} access required", 403)
        
        g.user = user
        logger.debug(f"User {user_id} authenticated for {request.path}")
        return None
    except Exception as e:
        logger.error(f"Authentication error for user {user_id} at {request.remote_addr} for {request.path}: {str(e)}")
        raise

# Authentication middleware
def admin_required(f):
    """
    Decorator to require admin role
    """
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        error_response = _check_user_access(required_roles=['admin'])
        if error_response:
            return error_response
        return f(*args, **kwargs)
    return decorated

def moderator_required(f):
    """
    Decorator to require moderator or admin role
    """
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        error_response = _check_user_access(required_roles=['admin', 'moderator'])
        if error_response:
            return error_response
        return f(*args, **kwargs)
    return decorated

def login_required(f):
    """
    Decorator to require any authenticated user
    """
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        error_response = _check_user_access()
        if error_response:
            return error_response
        return f(*args, **kwargs)
    return decorated

def optional_jwt(f):
    """
    Decorator that makes JWT optional
    If token is provided and valid, sets g.user
    If not, continues without user
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = User.query.get(user_id)
                if user and not user.is_banned:
                    g.user = user
                    logger.debug(f"Optional JWT - User authenticated: {user_id} for {request.path}")
                else:
                    g.user = None
                    logger.debug(f"Optional JWT - Invalid or banned user: {user_id} for {request.path}")
            else:
                g.user = None
                logger.debug(f"Optional JWT - No token provided for {request.path}")
        except Exception as e:
            logger.error(f"Optional JWT error for {request.path}: {str(e)}")
            g.user = None
        return f(*args, **kwargs)
    return decorated

# Rate limiting helper
def get_user_identifier():
    """
    Get user identifier for rate limiting
    Uses JWT user ID if available, otherwise IP address
    """
    try:
        user_id = get_jwt_identity()
        if user_id:
            logger.debug(f"Rate limit identifier: user:{user_id} for {request.path}")
            return f"user:{user_id}"
    except:
        pass
    
    ip = request.remote_addr
    logger.debug(f"Rate limit identifier: ip:{ip} for {request.path}")
    return f"ip:{ip}"

# Password reset token functions
def generate_password_reset_token(user_id, expiration_minutes=30):
    """
    Generate a password reset token
    """
    try:
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(minutes=expiration_minutes),
            'type': 'password_reset'
        }
        token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
        logger.debug(f"Password reset token generated for user: {user_id}")
        return token
    except Exception as e:
        logger.error(f"Error generating reset token: {str(e)}")
        raise ValueError(f"Error generating reset token: {str(e)}")

def verify_password_reset_token(token):
    """
    Verify and decode password reset token
    """
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        
        if payload.get('type') != 'password_reset':
            logger.warning("Invalid reset token type")
            return None
            
        user_id = payload.get('user_id')
        logger.debug(f"Password reset token verified for user: {user_id}")
        return user_id
    except jwt.ExpiredSignatureError:
        logger.warning("Password reset token expired")
        return None
    except jwt.InvalidTokenError:
        logger.warning("Invalid password reset token")
        return None
    except Exception as e:
        logger.error(f"Error verifying reset token: {str(e)}")
        return None

# Input sanitization
def sanitize_input(text):
    """
    Sanitize input to prevent XSS and other injection attacks
    """
    if not text:
        return text
    
    try:
        # Remove dangerous HTML/JS
        sanitized = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.IGNORECASE)
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'on\w+=', '', sanitized, flags=re.IGNORECASE)
        # Additional sanitization for SQL injection
        sanitized = re.sub(r'[\'";]', '', sanitized)
        sanitized = sanitized.strip()
        logger.debug("Input sanitized successfully")
        return sanitized
    except Exception as e:
        logger.error(f"Error sanitizing input: {str(e)}")
        return text

def validate_file_extension(filename, allowed_extensions):
    """
    Validate file extension
    """
    if not filename:
        logger.warning("File validation: No filename provided")
        return False
    
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    result = extension in allowed_extensions
    logger.debug(f"File extension validation: {filename} - {'valid' if result else 'invalid'}")
    return result

def validate_file_size(file, max_size_mb=10):
    """
    Validate file size
    """
    if not file:
        logger.warning("File validation: No file provided")
        return False
    
    try:
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        max_size_bytes = max_size_mb * 1024 * 1024
        result = file_size <= max_size_bytes
        logger.debug(f"File size validation: {file_size} bytes - {'valid' if result else 'invalid'}")
        return result
    except Exception as e:
        logger.error(f"Error validating file size: {str(e)}")
        return False

# Export all functions
__all__ = [
    'hash_password',
    'verify_password', 
    'validate_password_strength',
    'validate_email',
    'validate_username',
    'admin_required',
    'moderator_required',
    'login_required',
    'optional_jwt',
    'get_user_identifier',
    'generate_password_reset_token',
    'verify_password_reset_token',
    'sanitize_input',
    'validate_file_extension',
    'validate_file_size'
]
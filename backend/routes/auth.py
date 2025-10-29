from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from backend.extensions import db
from backend.models.user import User
from backend.middleware.auth_middleware import validate_email, validate_username, validate_password_strength
import logging
from datetime import timedelta
from backend.utils.error_handler import create_error_response

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

# Giả định blocklist cho logout
blocklist = set()

def create_tokens(user):
    """Helper function to create access and refresh tokens"""
    user_identity = str(user.id)
    access_token = create_access_token(
        identity=user_identity,
        expires_delta=timedelta(hours=24),
        additional_claims={"role": user.role, "username": user.username}
    )
    refresh_token = create_refresh_token(identity=user_identity)
    return access_token, refresh_token

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register endpoint with local DB integration"""
    # ✅ Định nghĩa biến trước để tránh lỗi reference
    username = ""
    email = ""
    
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No JSON data provided", 400)
            
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        logger.info(f"📝 Register attempt for user: {username} from IP: {request.remote_addr}")
        
        # Validate input
        is_valid_username, username_message = validate_username(username)
        if not is_valid_username:
            logger.warning(f"Invalid username: {username} - {username_message}")
            return create_error_response(username_message, 400)
        
        is_valid_email, email_message = validate_email(email)
        if not is_valid_email:
            logger.warning(f"Invalid email: {email} - {email_message}")
            return create_error_response(email_message, 400)
        
        is_valid_password, password_message = validate_password_strength(password)
        if not is_valid_password:
            logger.warning(f"Invalid password for user: {username} - {password_message}")
            return create_error_response(password_message, 400)
        
        # ✅ Sử dụng application context cho database operations
        with current_app.app_context():
            # Kiểm tra trùng username hoặc email
            if User.query.filter_by(username=username).first():
                logger.warning(f"Username already exists: {username}")
                return create_error_response("Username already exists", 400)
            
            if User.query.filter_by(email=email).first():
                logger.warning(f"Email already exists: {email}")
                return create_error_response("Email already exists", 400)
            
            # Tạo user mới
            user = User(username=username, email=email, role='member')
            user.set_password(password)
            
            # Thêm user vào database
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)
        
        # Tạo tokens với user đã được refresh
        access_token, refresh_token = create_tokens(user)
        
        logger.info(f"✅ Registration successful for user: {username} (ID: {user.id})")
        return jsonify({
            "success": True,
            "message": "Registration successful",
            "data": {
                "token": access_token,
                "refreshToken": refresh_token,
                "user": user.to_dict()
            }
        }), 201
        
    except Exception as e:
        # ✅ Rollback session khi có lỗi (kiểm tra db tồn tại)
        try:
            if db.session.is_active:
                db.session.rollback()
        except:
            pass
            
        logger.error(f"Registration error for {username}: {str(e)}")
        return create_error_response("Internal server error", 500)
@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint with local DB integration"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        logger.info(f"🔐 Login attempt for user: {username} from IP: {request.remote_addr}")
        
        if not username or not password:
            logger.warning("Missing username or password")
            return create_error_response("Username and password are required", 400)
        
        with current_app.app_context():
            user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            logger.warning(f"Invalid credentials for user: {username}")
            return create_error_response("Invalid username or password", 401)
        
        if user.is_banned:
            logger.info(f"Banned user attempted login: {username} (ID: {user.id})")
            return create_error_response("Account is banned", 403)
        
        access_token, refresh_token = create_tokens(user)
        
        logger.info(f"✅ Login successful for user: {username} (ID: {user.id})")
        return jsonify({
            "success": True,
            "message": "Login successful",
            "data": {
                "token": access_token,
                "refreshToken": refresh_token,
                "user": user.to_dict()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error for {username}: {str(e)}")
        print(f"Login error for {username}: {str(e)}")  # Debug
        return create_error_response("Internal server error", 500)

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info from JWT"""
    try:
        user_identity = get_jwt_identity()
        with current_app.app_context():
            user = User.query.get(int(user_identity))
        
        if not user:
            logger.warning(f"User not found: {user_identity}")
            return create_error_response("User not found", 404)
        
        if user.is_banned:
            logger.info(f"Banned user accessed /me: {user.username} (ID: {user.id})")
            return create_error_response("Account is banned", 403)
        
        logger.info(f"Retrieved info for user: {user.username} (ID: {user.id})")
        return jsonify({
            "success": True,
            "message": "Current user info",
            "data": user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Get user error for ID {user_identity}: {str(e)}")
        return create_error_response("Internal server error", 500)

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh JWT token"""
    try:
        user_identity = get_jwt_identity()
        with current_app.app_context():
            user = User.query.get(int(user_identity))
        
        if not user:
            logger.warning(f"User not found for refresh: {user_identity}")
            return create_error_response("User not found", 404)
        
        if user.is_banned:
            logger.info(f"Banned user attempted refresh: {user.username} (ID: {user.id})")
            return create_error_response("Account is banned", 403)
        
        new_access_token = create_access_token(
            identity=user_identity,
            expires_delta=timedelta(hours=24),
            additional_claims={"role": user.role, "username": user.username}
        )
        
        logger.info(f"Token refreshed for user: {user.username} (ID: {user.id})")
        return jsonify({
            "success": True,
            "message": "Token refreshed",
            "data": {
                "token": new_access_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Refresh token error for ID {user_identity}: {str(e)}")
        return create_error_response("Internal server error", 500)

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user by adding token to blocklist"""
    try:
        from flask_jwt_extended import get_jwt
        jti = get_jwt()['jti']
        user_identity = get_jwt_identity()
        
        blocklist.add(jti)
        logger.info(f"Logout successful for user ID: {user_identity}, JTI: {jti}")
        
        return jsonify({
            "success": True,
            "message": "Logout successful"
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error for ID {user_identity}: {str(e)}")
        return create_error_response("Internal server error", 500)

def init_jwt(app):
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        return jwt_payload['jti'] in blocklist
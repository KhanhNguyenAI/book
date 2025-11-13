from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, decode_token
from extensions import db
from models.user import User
from models.refresh_token import RefreshToken
from middleware.auth_middleware import validate_email, validate_username, validate_password_strength
import logging
from datetime import timedelta, timezone
from utils.error_handler import create_error_response

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

# Giả định blocklist cho logout (AT)
blocklist = set()

def get_device_info():
    """Lấy thông tin device từ request"""
    user_agent = request.headers.get('User-Agent', '')[:255]
    ip = request.remote_addr or 'unknown'
    return f"{ip}|{user_agent}"

def create_tokens(user, device_info=None):
    """
    Helper function to create access and refresh tokens
    - AT: 15 phút, không lưu DB
    - RT: 30 ngày, lưu DB với rotation support
    """
    user_identity = str(user.id)
    
    # Tạo Access Token (1 phút để dễ debug)
    access_token = create_access_token(
        identity=user_identity,
        expires_delta=timedelta(minutes=10),
        additional_claims={"role": user.role, "username": user.username}
    )
    
    # Tạo Refresh Token (30 ngày, lưu DB)
    if device_info is None:
        device_info = get_device_info()
    
    refresh_token_str, refresh_token_obj = RefreshToken.create_token(
        user_id=user.id,
        device_info=device_info
    )
    
    return access_token, refresh_token_str

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
        device_info = get_device_info()
        access_token, refresh_token = create_tokens(user, device_info)
        
        logger.info(f"✅ Registration successful for user: {username} (ID: {user.id})")
        
        # Tạo response với RT trong httpOnly cookie
        response = make_response(jsonify({
            "success": True,
            "message": "Registration successful",
            "data": {
                "token": access_token,
                "user": user.to_dict()
            }
        }), 201)
        
        # Set RT trong httpOnly cookie
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=30 * 24 * 60 * 60,  # 30 ngày
            httponly=True,
            secure=False,  # Set True trong production với HTTPS
            samesite='Lax'
        )
        
        return response
        
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
        
        device_info = get_device_info()
        access_token, refresh_token = create_tokens(user, device_info)
        
        logger.info(f"✅ Login successful for user: {username} (ID: {user.id})")
        
        # Tạo response với RT trong httpOnly cookie
        response = make_response(jsonify({
            "success": True,
            "message": "Login successful",
            "data": {
                "token": access_token,
                "user": user.to_dict()
            }
        }), 200)
        
        # Set RT trong httpOnly cookie
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=30 * 24 * 60 * 60,  # 30 ngày
            httponly=True,
            secure=False,  # Set True trong production với HTTPS
            samesite='Lax'
        )
        
        return response
        
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
def refresh():
    """
    Refresh JWT token với RT rotation và reuse detection
    - Nhận RT từ httpOnly cookie hoặc body
    - Validate RT trong DB
    - Rotate RT (tạo mới, revoke cũ)
    - Detect reuse và revoke tất cả nếu có
    """
    try:
        # Lấy RT từ cookie (ưu tiên) hoặc body
        data = request.get_json(silent=True) or {}
        cookie_token = request.cookies.get('refresh_token')
        body_token = data.get('refresh_token')
        refresh_token = cookie_token or body_token

        logger.info(
            "🔄 Refresh token request received",
            extra={
                "has_cookie": bool(cookie_token),
                "has_body_token": bool(body_token),
                "path": request.path,
                "ip": request.remote_addr,
            },
        )
        
        if not refresh_token:
            logger.warning("Refresh token not provided")
            return create_error_response("Refresh token required", 401)

        if not isinstance(refresh_token, str):
            logger.warning(f"Invalid refresh token type: {type(refresh_token)}")
            return create_error_response("Invalid refresh token", 401)
        
        # Validate RT trong DB
        token_obj = RefreshToken.validate_token(refresh_token)
        
        if not token_obj:
            logger.warning(f"Invalid or expired refresh token")
            return create_error_response("Invalid or expired refresh token", 401)
        
        # Lấy user
        with current_app.app_context():
            user = User.query.get(token_obj.user_id)
        
        if not user:
            logger.warning(f"User not found for refresh: {token_obj.user_id}")
            return create_error_response("User not found", 404)
        
        if user.is_banned:
            logger.info(f"Banned user attempted refresh: {user.username} (ID: {user.id})")
            # Revoke tất cả tokens của user bị ban
            RefreshToken.revoke_user_tokens(user.id)
            return create_error_response("Account is banned", 403)
        
        # Rotate RT (tạo mới, revoke cũ) với reuse detection
        try:
            device_info = get_device_info()
            new_refresh_token_str, new_token_obj = token_obj.rotate_token(device_info)
        except ValueError as e:
            # Reuse detected
            logger.error(f"Token reuse detected for user {user.id}: {str(e)}")
            return create_error_response("Token reuse detected - please login again", 401)
        
        # Tạo AT mới (1 phút để dễ debug)
        user_identity = str(user.id)
        new_access_token = create_access_token(
            identity=user_identity,
            expires_delta=timedelta(minutes=1),
            additional_claims={"role": user.role, "username": user.username}
        )
        
        logger.info(f"Token refreshed for user: {user.username} (ID: {user.id})")
        
        # Tạo response với RT mới trong cookie
        response = make_response(jsonify({
            "success": True,
            "message": "Token refreshed",
            "data": {
                "token": new_access_token
            }
        }), 200)
        
        # Set RT mới trong httpOnly cookie
        response.set_cookie(
            'refresh_token',
            new_refresh_token_str,
            max_age=30 * 24 * 60 * 60,  # 30 ngày
            httponly=True,
            secure=False,  # Set True trong production với HTTPS
            samesite='Lax'
        )
        
        return response
        
    except Exception as e:
        logger.error("Refresh token error", exc_info=True)
        return create_error_response("Internal server error", 500)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout user:
    - Revoke RT từ cookie/body
    - Thêm AT vào blocklist (nếu có)
    - Xóa RT cookie
    """
    try:
        user_identity = None
        
        # Nếu có AT, thêm vào blocklist
        try:
            from flask_jwt_extended import get_jwt
            jti = get_jwt()['jti']
            user_identity = get_jwt_identity()
            blocklist.add(jti)
            logger.info(f"Access token added to blocklist for user ID: {user_identity}")
        except:
            # Không có AT hoặc đã hết hạn, không sao
            pass
        
        # Revoke RT
        refresh_token = request.cookies.get('refresh_token') or (request.json and request.json.get('refresh_token'))
        
        if refresh_token:
            token_obj = RefreshToken.revoke_token(refresh_token)
            if token_obj:
                user_identity = user_identity or token_obj.user_id
                logger.info(f"Refresh token revoked for user ID: {user_identity}")
        
        # Tạo response và xóa RT cookie
        response = make_response(jsonify({
            "success": True,
            "message": "Logout successful"
        }), 200)
        
        response.set_cookie('refresh_token', '', max_age=0, httponly=True)
        
        if user_identity:
            logger.info(f"Logout successful for user ID: {user_identity}")
        
        return response
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return create_error_response("Internal server error", 500)

def init_jwt(app):
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        return jwt_payload['jti'] in blocklist
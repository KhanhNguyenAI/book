from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate

# -----------------------------
# GLOBAL EXTENSIONS - KHÔNG init_app TẠI ĐÂY
# -----------------------------

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
limiter = Limiter(key_func=get_remote_address, enabled=False)

# ✅ SocketIO chạy eventlet, CHỈ cấu hình 1 lần tại đây
socketio = SocketIO(
    async_mode="eventlet",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
    manage_session=False
)

cors = CORS()
migrate = Migrate()


# -----------------------------
# INITIALIZER
# -----------------------------

def init_extensions(app):
    """Initialize all Flask extensions."""
    try:
        db.init_app(app)
        jwt.init_app(app)
        mail.init_app(app)
        limiter.init_app(app)
        migrate.init_app(app, db)

        # ✅ SocketIO init_app DUY NHẤT 1 LẦN
        socketio.init_app(app)

        # ✅ CORS - Cho phép tất cả origin từ frontend (bao gồm mạng LAN)
        cors_origins = app.config.get("CORS_ORIGINS", "*")
        # Nếu CORS_ORIGINS là list rỗng hoặc chỉ có phần tử rỗng, cho phép tất cả
        if isinstance(cors_origins, list):
            if len(cors_origins) == 0 or (len(cors_origins) == 1 and cors_origins[0] == ''):
                cors_origins = "*"
        # Nếu CORS_ORIGINS là string chứa nhiều origin phân cách bởi dấu phẩy, split thành list
        elif isinstance(cors_origins, str) and cors_origins != "*" and ',' in cors_origins:
            cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
            if len(cors_origins) == 0:
                cors_origins = "*"
        
        # Khi origins="*", không thể dùng supports_credentials=True (Flask-CORS limitation)
        # Nếu cần credentials, phải chỉ định rõ origin cụ thể
        use_credentials = cors_origins != "*"
        
        cors.init_app(
            app,
            resources={
                r"/api/*": {
                    "origins": cors_origins,
                    "supports_credentials": use_credentials
                },
                r"/socket.io/*": {        # ✅ THÊM để WebSocket không lỗi
                    "origins": "*"
                }
            }
        )

        # ✅ Rate limit theo user_id
        from middleware.auth_middleware import get_user_identifier
        limiter.key_func = get_user_identifier

    except Exception as e:
        raise RuntimeError(f"Failed to initialize extensions: {e}")
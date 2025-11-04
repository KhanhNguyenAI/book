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

        # ✅ CORS CHUẨN, KHÔNG bừa bãi
        cors.init_app(
            app,
            resources={
                r"/api/*": {
                    "origins": app.config.get("CORS_ORIGINS", "*")
                },
                r"/socket.io/*": {        # ✅ THÊM để WebSocket không lỗi
                    "origins": "*"
                }
            },
            supports_credentials=True
        )

        # ✅ Rate limit theo user_id
        from middleware.auth_middleware import get_user_identifier
        limiter.key_func = get_user_identifier

    except Exception as e:
        raise RuntimeError(f"Failed to initialize extensions: {e}")
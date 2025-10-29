from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
limiter = Limiter(key_func=get_remote_address,enabled=False)
socketio = SocketIO()
cors = CORS()
migrate = Migrate()

def init_extensions(app):
    """Initialize all Flask extensions."""
    try:
        db.init_app(app)
        jwt.init_app(app)
        mail.init_app(app)
        limiter.init_app(app)
        socketio.init_app(app, cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'))
        cors.init_app(app, resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', '*')}})
        migrate.init_app(app, db)
        from middleware.auth_middleware import get_user_identifier
        limiter.key_func = get_user_identifier
    except Exception as e:
        raise RuntimeError(f"Failed to initialize extensions: {e}")
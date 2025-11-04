import eventlet
eventlet.monkey_patch()
import os
import logging
import sys
from flask import Flask
from extensions import db, jwt, mail, limiter, socketio, cors, migrate, init_extensions
from routes.auth import auth_bp
from routes.book import book_bp
from routes.user import user_bp
from routes.message import message_bp, init_socketio, register_socketio_events
from routes.bot import bot_bp, init_rag_chatbot
from models.user import User
from models.book import Book
from models.author import Author
from models.book_author import BookAuthor
from models.category import Category
from models.book_rating import BookRating
from models.book_comment import BookComment
from models.book_page import BookPage
from models.user_preference import UserPreference
from models.bot_conversation import BotConversation
from models.message import Message
from models.message_report import MessageReport
from models.bookmark import Bookmark
from models.reading_history import ReadingHistory
from models.password_reset import PasswordReset
from models.chat_room import ChatRoom
from models.chat_room_member import ChatRoomMember
from models.recommendation import Recommendation
from models.favorite import Favorite
from utils.error_handler import create_error_response
from dotenv import load_dotenv
from sqlalchemy.sql import text
from routes.chat_room import chat_room_bp

# Ensure the backend directory is in sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables explicitly
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)

    # Load configuration from .env
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL is not set in .env file")
        raise ValueError("DATABASE_URL is not set in .env file")

    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY'),
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY'),
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ECHO=True,
        SQLALCHEMY_ENGINE_OPTIONS={
            'pool_pre_ping': True,
            'pool_recycle': 1800,
            'connect_args': {'sslmode': 'disable'}
        },
        MAIL_SERVER=os.getenv('MAIL_SERVER'),
        MAIL_PORT=int(os.getenv('MAIL_PORT', 587)),
        MAIL_USE_TLS=True,
        MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
        MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER'),
        CORS_ORIGINS=os.getenv('CORS_ORIGINS', '').split(','),
        RATELIMIT_DEFAULT="100 per day, 20 per hour"
    )

    # Validate required configurations
    required_configs = ['SECRET_KEY', 'JWT_SECRET_KEY', 'SQLALCHEMY_DATABASE_URI']
    for config in required_configs:
        if not app.config.get(config):
            logger.error(f"Missing required configuration: {config}")
            raise ValueError(f"Missing required configuration: {config}")

    # Initialize extensions
    try:
        init_extensions(app)
        from middleware.auth_middleware import get_user_identifier
        limiter.key_func = get_user_identifier
        logger.info("Extensions initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize extensions: {e}")
        raise

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(book_bp, url_prefix='/api/books')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(bot_bp, url_prefix='/api')
    app.register_blueprint(message_bp, url_prefix='/api')
    app.register_blueprint(chat_room_bp, url_prefix='/api') 
    logger.info("Blueprints registered successfully")

    # Initialize SocketIO
    init_socketio(socketio)
    register_socketio_events(socketio)
    logger.info("SocketIO events registered successfully")

    # Create database tables if they don't exist
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise

    # Initialize rag_chatbot
    try:
        app.rag_chatbot = init_rag_chatbot()
        logger.info("RAG chatbot initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG chatbot: {e}")
        app.rag_chatbot = None

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return create_error_response('Missing Authorization Header', 401)

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return create_error_response('Invalid JWT token', 401)

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return create_error_response('Token has expired', 401)

    # Global error handler
    @app.errorhandler(Exception)
    def handle_error(e):
        logger.error(f"Unhandled error: {e}")
        return create_error_response(str(e), 500)

    # Health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(text("SELECT 1"))
            vector_db_stats = app.rag_chatbot.get_vector_db_stats() if app.rag_chatbot else {}
            return {
                'status': 'success',
                'message': 'Server is running',
                'db_status': 'connected',
                'vector_db_stats': vector_db_stats
            }, 200
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return create_error_response(str(e), 500)
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = os.getenv('PORT', '5000')
    try:
        port = int(port)
    except (TypeError, ValueError) as e:
        logger.error(f"Invalid PORT value: {port}. Using default port 5000. Error: {e}")
        port = 5000
    
    # ✅ BỎ allow_unsafe_werkzeug vì đã dùng eventlet
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=port, 
        debug=os.getenv('FLASK_ENV') == 'development'
    )
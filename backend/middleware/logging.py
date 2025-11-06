from functools import wraps
from flask import request
import logging

logger = logging.getLogger(__name__)

def log_requests(f):
    """
    Decorator to log incoming requests.
    Logs method, path, IP address, and user ID if available.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # Get user ID if available (from JWT token)
            user_id = None
            try:
                from flask_jwt_extended import get_jwt_identity
                user_id = get_jwt_identity()
            except:
                pass
            
            # Log request
            log_message = f"{request.method} {request.path} from {request.remote_addr}"
            if user_id:
                log_message += f" (user: {user_id})"
            
            logger.info(log_message)
        except Exception as e:
            logger.error(f"Error logging request: {e}")
        
        return f(*args, **kwargs)
    return decorated


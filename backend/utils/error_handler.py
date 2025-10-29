from flask import jsonify
from werkzeug.exceptions import HTTPException

def create_error_response(message, status_code):
    return jsonify({'error': message}), status_code

def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return create_error_response(e.description, e.code)

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        return create_error_response('Internal server error', 500)

    @app.errorhandler(400)
    def handle_bad_request(e):
        return create_error_response('Bad request', 400)

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return create_error_response('Unauthorized', 401)

    @app.errorhandler(403)
    def handle_forbidden(e):
        return create_error_response('Forbidden', 403)

    @app.errorhandler(404)
    def handle_not_found(e):
        return create_error_response('Resource not found', 404)
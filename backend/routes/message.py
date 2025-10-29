from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room, leave_room
from backend.extensions import db

from backend.models.message import Message
from backend.models.message_report import MessageReport
from backend.models.user import User
from backend.middleware.auth_middleware import admin_required, sanitize_input
from backend.utils.error_handler import create_error_response
from datetime import datetime
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)
message_bp = Blueprint('message', __name__)

# SocketIO instance (injected from app.py)
socketio = None

def init_socketio(socketio_instance):
    """Initialize SocketIO instance"""
    global socketio
    socketio = socketio_instance
    if socketio is None:
        logger.error("SocketIO instance initialization failed")
        raise ValueError("SocketIO instance cannot be None")

# Validation helper
def validate_image_url(url):
    """Validate image URL format and ensure it's an image"""
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        return url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))
    except Exception:
        return False

# Helper function to serialize message data
def message_to_dict(message, include_user=True):
    """Convert Message object to dict"""
    data = {
        'id': message.id,
        'content': message.content,
        'image_url': message.image_url or '',
        'parent_id': message.parent_id,
        'replies_count': Message.query.filter_by(parent_id=message.id, is_deleted=False).count(),
        'created_at': message.created_at.isoformat() if message.created_at else None
    }
    if include_user and message.user:
        data['user'] = {
            'id': message.user.id,
            'username': message.user.username,
            'avatar_url': message.user.avatar_url or '',
            'role': message.user.role
        }
    return data

# ============================================
# HELPER: Broadcast functions for SocketIO
# ============================================

def broadcast_new_message(message, user):
    """Broadcast new message to all clients in global_chat"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting new message")
        return
    try:
        socketio.emit('new_message', message_to_dict(message), namespace='/chat', room='global_chat')
        logger.debug(f"Broadcasted new message {message.id} to global_chat")
    except Exception as e:
        logger.error(f"Error broadcasting new message {message.id}: {str(e)}")

def broadcast_message_deleted(message_id, deleted_by_admin=False):
    """Broadcast message deletion event"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting message deletion")
        return
    try:
        socketio.emit('message_deleted', {
            'message_id': message_id,
            'deleted_by_admin': deleted_by_admin
        }, namespace='/chat', room='global_chat')
        logger.debug(f"Broadcasted deletion of message {message_id}")
    except Exception as e:
        logger.error(f"Error broadcasting message deletion {message_id}: {str(e)}")

def broadcast_reply_added(parent_id):
    """Broadcast reply count update"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting reply added")
        return
    try:
        replies_count = Message.query.filter_by(parent_id=parent_id, is_deleted=False).count()
        socketio.emit('reply_added', {
            'parent_id': parent_id,
            'replies_count': replies_count
        }, namespace='/chat', room='global_chat')
        logger.debug(f"Broadcasted reply count update for parent {parent_id}")
    except Exception as e:
        logger.error(f"Error broadcasting reply added for parent {parent_id}: {str(e)}")

def broadcast_new_report(report):
    """Broadcast new report to admins"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting new report")
        return
    try:
        socketio.emit('new_report', {
            'report_id': report.id,
            'message_id': report.message_id,
            'reason': report.reason
        }, namespace='/admin', room='admin_room')
        logger.debug(f"Broadcasted new report {report.id} to admin_room")
    except Exception as e:
        logger.error(f"Error broadcasting new report {report.id}: {str(e)}")

def broadcast_report_resolved(report_id, status):
    """Broadcast report resolution to admins"""
    if not socketio:
        logger.error("SocketIO not initialized for broadcasting report resolution")
        return
    try:
        socketio.emit('report_resolved', {
            'report_id': report_id,
            'status': status
        }, namespace='/admin', room='admin_room')
        logger.debug(f"Broadcasted report resolution {report_id} with status {status}")
    except Exception as e:
        logger.error(f"Error broadcasting report resolution {report_id}: {str(e)}")

# ============================================
# MEMBER: View Messages
# ============================================

@message_bp.route('/messages', methods=['GET'])
def get_messages():
    """Get messages (is_deleted=False) with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        messages_query = Message.query.filter_by(is_deleted=False, parent_id=None)\
            .options(db.joinedload(Message.user))\
            .order_by(Message.created_at.desc())
        
        paginated = messages_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = [message_to_dict(msg) for msg in paginated.items]
        result.reverse()  # Chronological order
        
        logger.info(f"Retrieved {len(result)} messages for page {page} by IP {request.remote_addr}")
        return jsonify({
            'status': 'success',
            'messages': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching messages for page {page}: {str(e)}")
        return create_error_response(str(e), 500)

@message_bp.route('/messages/<int:message_id>/replies', methods=['GET'])
def get_message_replies(message_id):
    """Get replies for a message"""
    try:
        message = Message.query.get(message_id)
        if not message or message.is_deleted:
            logger.warning(f"Message {message_id} not found or deleted")
            return create_error_response('Message not found or deleted', 404)
        
        replies = Message.query.filter_by(parent_id=message_id, is_deleted=False)\
            .options(db.joinedload(Message.user))\
            .order_by(Message.created_at.asc()).all()
        
        result = [message_to_dict(reply) for reply in replies]
        
        logger.info(f"Retrieved {len(result)} replies for message {message_id} by IP {request.remote_addr}")
        return jsonify({
            'status': 'success',
            'replies': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching replies for message {message_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Send Message
# ============================================

@message_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    """Send message (support content, image_url, parent_id) with real-time broadcast"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to send message")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        content = sanitize_input(data.get('content', '').strip())
        parent_id = data.get('parent_id')
        image_url = data.get('image_url', '').strip()
        
        if not content and not image_url:
            logger.warning("Empty content and image_url")
            return create_error_response('Content or image_url required', 400)
        
        if content and len(content) > 1000:
            logger.warning("Content too long")
            return create_error_response('Content too long (max 1000 characters)', 400)
        
        if image_url and not validate_image_url(image_url):
            logger.warning(f"Invalid image URL: {image_url}")
            return create_error_response('Invalid image URL (must be .png, .jpg, .jpeg, or .gif)', 400)
        
        if parent_id:
            parent = Message.query.get(parent_id)
            if not parent or parent.is_deleted:
                logger.warning(f"Parent message {parent_id} not found or deleted")
                return create_error_response('Parent message not found or deleted', 404)
        
        message = Message(
            user_id=user_id,
            content=content or None,
            image_url=image_url or None,
            parent_id=parent_id,
            is_deleted=False,
            created_at=datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        broadcast_new_message(message, user)
        if parent_id:
            broadcast_reply_added(parent_id)
        
        logger.info(f"User {user_id} sent message {message.id}")
        return jsonify({
            'status': 'success',
            'message': 'Message sent',
            'message_id': message.id,
            'created_at': message.created_at.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error sending message by user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Delete Own Message
# ============================================

@message_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Delete own message (soft delete) with real-time broadcast"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to delete message {message_id}")
            return create_error_response('Account is banned', 403)
        
        message = Message.query.filter_by(id=message_id, user_id=user_id).first()
        if not message:
            logger.warning(f"Message {message_id} not found or unauthorized for user {user_id}")
            return create_error_response('Message not found or unauthorized', 404)
        
        if message.is_deleted:
            logger.warning(f"Message {message_id} already deleted")
            return create_error_response('Message already deleted', 400)
        
        parent_id = message.parent_id
        message.is_deleted = True
        db.session.commit()
        
        broadcast_message_deleted(message_id, deleted_by_admin=False)
        if parent_id:
            broadcast_reply_added(parent_id)
        
        logger.info(f"User {user_id} deleted message {message_id}")
        return jsonify({
            'status': 'success',
            'message': 'Message deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting message {message_id} by user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER: Report Message
# ============================================

@message_bp.route('/messages/<int:message_id>/report', methods=['POST'])
@jwt_required()
def report_message(message_id):
    """Report a message"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return create_error_response('User not found', 404)
        
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to report message {message_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        if not data or 'reason' not in data:
            logger.warning("Missing reason for report")
            return create_error_response('Reason required', 400)
        
        reason = sanitize_input(data['reason'].strip())
        if not reason or len(reason) > 500:
            logger.warning("Invalid report reason length")
            return create_error_response('Reason must be 1-500 characters', 400)
        
        message = Message.query.get(message_id)
        if not message or message.is_deleted:
            logger.warning(f"Message {message_id} not found or deleted")
            return create_error_response('Message not found or deleted', 404)
        
        if message.user_id == user_id:
            logger.warning(f"User {user_id} attempted to report own message {message_id}")
            return create_error_response('Cannot report own message', 400)
        
        # Limit reports per user (e.g., max 5 pending reports)
        if MessageReport.query.filter_by(reporter_id=user_id, status='pending').count() >= 5:
            logger.warning(f"User {user_id} exceeded report limit")
            return create_error_response('Maximum pending reports reached (5)', 400)
        
        existing = MessageReport.query.filter_by(message_id=message_id, reporter_id=user_id).first()
        if existing:
            logger.info(f"User {user_id} already reported message {message_id}")
            return jsonify({
                'status': 'success',
                'message': 'Already reported',
                'report_id': existing.id
            }), 200
        
        report = MessageReport(
            message_id=message_id,
            reporter_id=user_id,
            reason=reason,
            status='pending',
            created_at=datetime.utcnow()
        )
        
        db.session.add(report)
        db.session.commit()
        
        broadcast_new_report(report)
        
        logger.info(f"User {user_id} reported message {message_id}")
        return jsonify({
            'status': 'success',
            'message': 'Report submitted',
            'report_id': report.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reporting message {message_id} by user {user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: View Reports
# ============================================

@message_bp.route('/messages/reports', methods=['GET'])
@admin_required
def get_reports():
    """Get message reports with pagination"""
    try:
        current_user_id = get_jwt_identity()
        status = request.args.get('status', 'pending')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if status not in ['pending', 'approved', 'rejected']:
            logger.warning(f"Invalid report status: {status}")
            return create_error_response('Invalid status (pending, approved, rejected)', 400)
        
        reports_query = MessageReport.query.filter_by(status=status)\
            .options(
                db.joinedload(MessageReport.message).joinedload(Message.user),
                db.joinedload(MessageReport.reporter),
                db.joinedload(MessageReport.resolved_by)
            ).order_by(MessageReport.created_at.desc())
        
        paginated = reports_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for report in paginated.items:
            result.append({
                'id': report.id,
                'message': message_to_dict(report.message) if report.message else None,
                'reporter': {
                    'id': report.reporter.id,
                    'username': report.reporter.username
                } if report.reporter else None,
                'reason': report.reason,
                'status': report.status,
                'resolved_by': {
                    'id': report.resolved_by.id,
                    'username': report.resolved_by.username
                } if report.resolved_by else None,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'resolved_at': report.resolved_at.isoformat() if report.resolved_at else None
            })
        
        logger.info(f"Admin {current_user_id} retrieved {len(result)} reports for page {page}")
        return jsonify({
            'status': 'success',
            'reports': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching reports by admin {get_jwt_identity()}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: Resolve Report
# ============================================

@message_bp.route('/messages/reports/<int:report_id>/resolve', methods=['PUT'])
@admin_required
def resolve_report(report_id):
    """Resolve a report (approve/reject) with real-time broadcast"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data or 'action' not in data:
            logger.warning("Missing action for report resolution")
            return create_error_response('Action required', 400)
        
        action = data['action']
        if action not in ['approved', 'rejected']:
            logger.warning(f"Invalid action: {action}")
            return create_error_response('Invalid action (approved/rejected)', 400)
        
        report = MessageReport.query.get(report_id)
        if not report:
            logger.warning(f"Report {report_id} not found")
            return create_error_response('Report not found', 404)
        
        if report.status != 'pending':
            logger.warning(f"Report {report_id} already resolved")
            return create_error_response('Report already resolved', 400)
        
        if action == 'approved':
            message = Message.query.get(report.message_id)
            if message and not message.is_deleted:
                message.is_deleted = True
                broadcast_message_deleted(message.id, deleted_by_admin=True)
                if message.parent_id:
                    broadcast_reply_added(message.parent_id)
        
        report.status = action
        report.resolved_by_id = current_user_id
        report.resolved_at = datetime.utcnow()
        db.session.commit()
        
        broadcast_report_resolved(report_id, report.status)
        
        logger.info(f"Admin {current_user_id} resolved report {report_id} with action {action}")
        return jsonify({
            'status': 'success',
            'message': 'Report resolved'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resolving report {report_id} by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: Delete Any Message
# ============================================

@message_bp.route('/messages/<int:message_id>/admin-delete', methods=['DELETE'])
@admin_required
def admin_delete_message(message_id):
    """Admin delete any message with real-time broadcast"""
    try:
        current_user_id = get_jwt_identity()
        message = Message.query.get(message_id)
        if not message:
            logger.warning(f"Message {message_id} not found")
            return create_error_response('Message not found', 404)
        
        if message.is_deleted:
            logger.warning(f"Message {message_id} already deleted")
            return create_error_response('Message already deleted', 400)
        
        parent_id = message.parent_id
        message.is_deleted = True
        db.session.commit()
        
        broadcast_message_deleted(message_id, deleted_by_admin=True)
        if parent_id:
            broadcast_reply_added(parent_id)
        
        logger.info(f"Admin {current_user_id} deleted message {message_id}")
        return jsonify({
            'status': 'success',
            'message': 'Message deleted by admin'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting message {message_id} by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ADMIN: Get User Messages
# ============================================

@message_bp.route('/users/<int:user_id>/messages', methods=['GET'])
@admin_required
def get_user_messages(user_id):
    """Get all messages by a specific user (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found")
            return create_error_response('User not found', 404)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        messages_query = Message.query.filter_by(user_id=user_id, is_deleted=False)\
            .options(db.joinedload(Message.user))\
            .order_by(Message.created_at.desc())
        
        paginated = messages_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = [message_to_dict(msg) for msg in paginated.items]
        result.reverse()  # Chronological order
        
        logger.info(f"Admin {current_user_id} retrieved {len(result)} messages for user {user_id}")
        return jsonify({
            'status': 'success',
            'user': {
                'id': user.id,
                'username': user.username
            },
            'messages': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching messages for user {user_id} by admin {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# SOCKETIO EVENTS
# ============================================

def register_socketio_events(socketio_instance):
    """Register SocketIO events for global chat"""
    
    @socketio_instance.on('connect', namespace='/chat')
    @jwt_required()
    def handle_connect():
        """Client connects to chat"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for chat connect")
            return False
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to connect to chat")
            emit('error', {'message': 'Account is banned'}, namespace='/chat')
            return False
        join_room('global_chat')
        emit('connected', {'message': f'Connected to chat as {user.username}'}, namespace='/chat')
        logger.info(f"User {user_id} ({user.username}) connected to chat")
    
    @socketio_instance.on('disconnect', namespace='/chat')
    def handle_disconnect():
        """Client disconnects from chat"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user:
            leave_room('global_chat')
            emit('user_left', {
                'user_id': user_id,
                'username': user.username,
                'timestamp': datetime.utcnow().isoformat()
            }, namespace='/chat', room='global_chat')
            logger.info(f"User {user_id} ({user.username}) disconnected from chat")
    
    @socketio_instance.on('join_chat', namespace='/chat')
    @jwt_required()
    def handle_join_chat(data):
        """User joins global chat room"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for join_chat")
            return False
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to join chat")
            emit('error', {'message': 'Account is banned'}, namespace='/chat')
            return False
        join_room('global_chat')
        emit('user_joined', {
            'user_id': user_id,
            'username': user.username,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/chat', room='global_chat', include_self=False)
        logger.info(f"User {user_id} ({user.username}) joined global chat")
    
    @socketio_instance.on('leave_chat', namespace='/chat')
    @jwt_required()
    def handle_leave_chat(data):
        """User leaves global chat room"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for leave_chat")
            return False
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to leave chat")
            return False
        leave_room('global_chat')
        emit('user_left', {
            'user_id': user_id,
            'username': user.username,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/chat', room='global_chat')
        logger.info(f"User {user_id} ({user.username}) left global chat")
    
    @socketio_instance.on('typing', namespace='/chat')
    @jwt_required()
    def handle_typing(data):
        """User is typing"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for typing event")
            return False
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to trigger typing event")
            return False
        emit('user_typing', {
            'user_id': user_id,
            'username': user.username
        }, namespace='/chat', room='global_chat', include_self=False)
        logger.debug(f"User {user_id} ({user.username}) is typing")
    
    @socketio_instance.on('stop_typing', namespace='/chat')
    @jwt_required()
    def handle_stop_typing(data):
        """User stops typing"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for stop_typing event")
            return False
        if user.is_banned:
            logger.info(f"Banned user {user_id} attempted to trigger stop_typing event")
            return False
        emit('user_stop_typing', {
            'user_id': user_id
        }, namespace='/chat', room='global_chat', include_self=False)
        logger.debug(f"User {user_id} ({user.username}) stopped typing")
    
    @socketio_instance.on('connect', namespace='/admin')
    @jwt_required()
    def handle_admin_connect():
        """Admin connects to admin room"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            logger.warning(f"Non-admin user {user_id} attempted to connect to admin room")
            return False
        join_room('admin_room')
        emit('connected', {'message': f'Admin {user.username} connected to admin room'}, namespace='/admin')
        logger.info(f"Admin {user_id} ({user.username}) connected to admin room")
    
    @socketio_instance.on('disconnect', namespace='/admin')
    def handle_admin_disconnect():
        """Admin disconnects from admin room"""
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user:
            leave_room('admin_room')
            logger.info(f"Admin {user_id} ({user.username}) disconnected from admin room")
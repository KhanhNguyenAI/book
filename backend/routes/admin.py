from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from middleware.auth_middleware import admin_required
from middleware.rate_limiting import rate_limit
from middleware.logging import log_requests
from extensions import db

from models.user import User
from models.book import Book
from models.category import Category
from models.author import Author
from models.book_comment import BookComment
from models.book_rating import BookRating
from models.message import Message
from models.message_report import MessageReport
from models.chat_room import ChatRoom
from models.reading_history import ReadingHistory
from models.bot_conversation import BotConversation
from models.view_history import ViewHistory
from models.bookmark import Bookmark
from sqlalchemy import func, distinct, case
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__)

def get_online_users_count():
    """Approximate online users based on recent activity (last 5 minutes)"""
    try:
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        # Get users who viewed books in the last 5 minutes
        recent_viewers = db.session.query(distinct(ViewHistory.user_id)).filter(
            ViewHistory.viewed_at >= cutoff_time
        ).subquery()
        
        # Get users who read books in the last 5 minutes
        recent_readers = db.session.query(distinct(ReadingHistory.user_id)).filter(
            ReadingHistory.last_read_at >= cutoff_time
        ).subquery()
        
        # Combine both sets (union)
        online_user_ids = db.session.query(recent_viewers.c.user_id).union(
            db.session.query(recent_readers.c.user_id)
        ).distinct()
        
        return online_user_ids.count()
    except Exception as e:
        logger.error(f"Error calculating online users: {e}")
        return 0

@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
@log_requests
def get_dashboard_stats():
    """Get admin dashboard statistics - Comprehensive overview"""
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        total_users = User.query.count()
        total_books = Book.query.count()
        total_messages = Message.query.filter_by(is_deleted=False).count()
        
        chatbot_messages_today = BotConversation.query.filter(
            BotConversation.created_at >= today_start
        ).count()
        
        online_users_count = get_online_users_count()
        
        # Top books by view count with unique viewers
        top_books = db.session.query(
            Book.id, Book.title, Book.view_count, Book.cover_image,
            func.count(func.distinct(ViewHistory.user_id)).label('unique_viewers')
        ).outerjoin(
            ViewHistory, Book.id == ViewHistory.book_id
        ).group_by(
            Book.id, Book.title, Book.view_count, Book.cover_image
        ).order_by(
            Book.view_count.desc()
        ).limit(10).all()
        
        top_books_data = [
            {
                "id": book.id,
                "title": book.title,
                "view_count": book.view_count or 0,
                "unique_viewers": book.unique_viewers or 0,
                "cover_image": book.cover_image or ''
            }
            for book in top_books
        ]
        
        # Chart data for last 7 days
        chart_data = {"users": [], "messages": [], "chatbot_messages": []}
        
        for i in range(6, -1, -1):
            day_start = today_start - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            chart_data["users"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": User.query.filter(
                    User.created_at >= day_start,
                    User.created_at < day_end
                ).count()
            })
            
            chart_data["messages"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": Message.query.filter(
                    Message.created_at >= day_start,
                    Message.created_at < day_end,
                    Message.is_deleted == False
                ).count()
            })
            
            chart_data["chatbot_messages"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": BotConversation.query.filter(
                    BotConversation.created_at >= day_start,
                    BotConversation.created_at < day_end
                ).count()
            })
        
        return jsonify({
            "status": "success",
            "stats": {
                "total_users": total_users,
                "total_books": total_books,
                "total_messages": total_messages,
                "chatbot_messages_today": chatbot_messages_today,
                "online_users": online_users_count,
                "top_books": top_books_data,
                "chart_data": chart_data
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": "Failed to load dashboard statistics"
        }), 500

@admin_bp.route('/users', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=60)
def get_users():
    """Get all users with pagination and search"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        role = request.args.get('role', '')
        is_banned = request.args.get('is_banned', '')
        
        query = User.query
        
        # Search filter
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                (User.username.ilike(search_term)) | (User.email.ilike(search_term))
            )
        
        # Role filter
        if role:
            query = query.filter_by(role=role)
        
        # Ban status filter
        if is_banned.lower() in ['true', 'false']:
            query = query.filter_by(is_banned=is_banned.lower() == 'true')
        
        # Pagination
        paginated = query.order_by(User.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        users = [{
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_banned": user.is_banned,
            "avatar_url": user.avatar_url or '',
            "created_at": user.created_at.isoformat() if user.created_at else None
        } for user in paginated.items]
        
        return jsonify({
            "status": "success",
            "users": users,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated.total,
                "pages": paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get users"
        }), 500

@admin_bp.route('/users/<int:user_id>/ban', methods=['PUT'])
@admin_required
@rate_limit(requests_per_minute=30)
def ban_user(user_id):
    """Ban or unban a user"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON data required"
            }), 400
            
        is_banned = data.get('is_banned')
        if is_banned is None:
            return jsonify({
                "status": "error",
                "message": "Missing is_banned field"
            }), 400
        
        # Cannot ban yourself
        if str(user_id) == current_user_id:
            return jsonify({
                "status": "error",
                "message": "Cannot ban yourself"
            }), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404
        
        # Cannot ban other admins
        if user.role == 'admin' and str(user_id) != current_user_id:
            return jsonify({
                "status": "error",
                "message": "Cannot ban other administrators"
            }), 403
        
        user.is_banned = is_banned
        db.session.commit()
        
        action = "banned" if is_banned else "unbanned"
        logger.info(f"User {user_id} {action} by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": f"User {action} successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ban user error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to update user ban status"
        }), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
@rate_limit(requests_per_minute=30)
def update_user_role(user_id):
    """Update user role"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON data required"
            }), 400
            
        role = data.get('role')
        if not role or role not in ['admin', 'member']:
            return jsonify({
                "status": "error",
                "message": "Invalid role. Must be 'admin' or 'member'"
            }), 400
        
        # Cannot change your own role
        if str(user_id) == current_user_id:
            return jsonify({
                "status": "error",
                "message": "Cannot change your own role"
            }), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404
        
        user.role = role
        db.session.commit()
        
        logger.info(f"User {user_id} role updated to {role} by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": f"User role updated to {role}"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update role error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to update user role"
        }), 500

@admin_bp.route('/reports', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=60)
def get_reports():
    """Get all message reports with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        query = MessageReport.query.options(
            db.joinedload(MessageReport.reporter),
            db.joinedload(MessageReport.message).joinedload(Message.user),
            db.joinedload(MessageReport.resolved_by)
        )
        
        if status:
            query = query.filter_by(status=status)
        
        paginated = query.order_by(MessageReport.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        reports = [{
            "id": report.id,
            "message_id": report.message_id,
            "reason": report.reason,
            "status": report.status,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
            "reporter": {
                "id": report.reporter.id,
                "username": report.reporter.username
            } if report.reporter else None,
            "resolved_by": {
                "id": report.resolved_by.id,
                "username": report.resolved_by.username
            } if report.resolved_by else None,
            "message": {
                "id": report.message.id,
                "content": report.message.content,
                "user": {
                    "id": report.message.user.id,
                    "username": report.message.user.username
                } if report.message.user else None
            } if report.message else None
        } for report in paginated.items]
        
        return jsonify({
            "status": "success",
            "reports": reports,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated.total,
                "pages": paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get reports error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get reports"
        }), 500

@admin_bp.route('/reports/<int:report_id>/resolve', methods=['PUT'])
@admin_required
@rate_limit(requests_per_minute=30)
def resolve_report(report_id):
    """Resolve a message report"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON data required"
            }), 400
            
        action = data.get('action')
        if action not in ['delete_message', 'keep_message', 'dismiss']:
            return jsonify({
                "status": "error",
                "message": "Invalid action. Must be 'delete_message', 'keep_message', or 'dismiss'"
            }), 400
        
        report = MessageReport.query.get(report_id)
        if not report:
            return jsonify({
                "status": "error",
                "message": "Report not found"
            }), 404
        
        if report.status == 'resolved':
            return jsonify({
                "status": "error",
                "message": "Report already resolved"
            }), 400
        
        if action == 'delete_message':
            message = Message.query.get(report.message_id)
            if message:
                message.is_deleted = True
        
        report.status = 'resolved'
        report.resolved_at = datetime.utcnow()
        report.resolved_by_id = current_user_id
        db.session.commit()
        
        logger.info(f"Report {report_id} resolved with action '{action}' by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": f"Report resolved with action: {action}"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Resolve report error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to resolve report"
        }), 500

@admin_bp.route('/messages', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=60)
def get_messages():
    """Get all messages with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        user_id = request.args.get('user_id', type=int)
        is_deleted = request.args.get('is_deleted', '')
        
        query = Message.query.options(
            joinedload(Message.user)
        )
        
        # Search filter
        if search:
            search_term = f'%{search}%'
            query = query.filter(Message.content.ilike(search_term))
        
        # User filter
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        # Deleted status filter
        if is_deleted.lower() in ['true', 'false']:
            query = query.filter_by(is_deleted=is_deleted.lower() == 'true')
        
        # Pagination
        paginated = query.order_by(Message.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        messages = [{
            "id": msg.id,
            "content": msg.content,
            "user_id": msg.user_id,
            "user": {
                "id": msg.user.id,
                "username": msg.user.username,
                "avatar_url": msg.user.avatar_url or ''
            } if msg.user else None,
            "room_id": msg.room_id,
            "parent_id": msg.parent_id,
            "is_deleted": msg.is_deleted,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } for msg in paginated.items]
        
        return jsonify({
            "status": "success",
            "messages": messages,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated.total,
                "pages": paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get messages error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get messages"
        }), 500

@admin_bp.route('/messages/stats', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=30)
def get_message_stats():
    """Get aggregated message statistics for visualization"""
    try:
        days = request.args.get('days', 7, type=int)
        if days < 1:
            days = 1
        if days > 90:
            days = 90

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days - 1)

        date_trunc = func.date(Message.created_at)

        base_filter = Message.query.filter(
            Message.created_at >= start_date
        )

        total_messages = base_filter.count()
        total_rooms = db.session.query(
            func.count(distinct(Message.room_id))
        ).filter(
            Message.created_at >= start_date
        ).scalar() or 0
        total_users = db.session.query(
            func.count(distinct(Message.user_id))
        ).filter(
            Message.created_at >= start_date,
            Message.user_id.isnot(None)
        ).scalar() or 0

        daily_rows = db.session.query(
            date_trunc.label('day'),
            func.count(Message.id).label('message_count'),
            func.count(distinct(Message.room_id)).label('room_count'),
            func.count(distinct(Message.user_id)).label('user_count')
        ).filter(
            Message.created_at >= start_date
        ).group_by(
            date_trunc
        ).order_by(
            date_trunc
        ).all()

        room_rows = db.session.query(
            Message.room_id,
            ChatRoom.name.label('room_name'),
            func.count(Message.id).label('message_count'),
            func.count(distinct(Message.user_id)).label('user_count'),
            func.max(Message.created_at).label('last_active')
        ).join(
            ChatRoom, ChatRoom.id == Message.room_id
        ).filter(
            Message.created_at >= start_date
        ).group_by(
            Message.room_id,
            ChatRoom.name
        ).order_by(
            func.count(Message.id).desc()
        ).all()

        room_daily_rows = db.session.query(
            Message.room_id,
            ChatRoom.name.label('room_name'),
            date_trunc.label('day'),
            func.count(Message.id).label('message_count'),
            func.count(distinct(Message.user_id)).label('user_count')
        ).join(
            ChatRoom, ChatRoom.id == Message.room_id
        ).filter(
            Message.created_at >= start_date
        ).group_by(
            Message.room_id,
            ChatRoom.name,
            date_trunc
        ).order_by(
            date_trunc,
            Message.room_id
        ).all()

        daily_stats = [
            {
                "date": row.day.isoformat(),
                "messages": int(row.message_count),
                "rooms": int(row.room_count),
                "users": int(row.user_count)
            }
            for row in daily_rows
        ]

        room_breakdown = [
            {
                "room_id": row.room_id,
                "room_name": row.room_name or f"Room #{row.room_id}",
                "messages": int(row.message_count),
                "users": int(row.user_count),
                "last_active": row.last_active.isoformat() if row.last_active else None
            }
            for row in room_rows
        ]

        room_daily = [
            {
                "room_id": row.room_id,
                "room_name": row.room_name or f"Room #{row.room_id}",
                "date": row.day.isoformat(),
                "messages": int(row.message_count),
                "users": int(row.user_count)
            }
            for row in room_daily_rows
        ]

        summary = {
            "days": days,
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat(),
            "total_messages": int(total_messages),
            "total_rooms": int(total_rooms),
            "total_users": int(total_users),
            "avg_messages_per_room": round(total_messages / total_rooms, 2) if total_rooms else 0.0
        }

        return jsonify({
            "status": "success",
            "summary": summary,
            "daily": daily_stats,
            "room_breakdown": room_breakdown,
            "room_daily": room_daily
        }), 200

    except Exception as e:
        logger.error(f"Get message stats error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get message statistics"
        }), 500

@admin_bp.route('/chatbot/stats', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=30)
def get_chatbot_stats():
    """Get chatbot feedback statistics for visualization"""
    try:
        days = request.args.get('days', 30, type=int)
        if days < 1:
            days = 1
        if days > 90:
            days = 90

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days - 1)

        base_query = BotConversation.query.filter(
            BotConversation.created_at >= start_date
        )

        total_conversations = base_query.count()
        positive_count = base_query.filter(BotConversation.is_positive.is_(True)).count()
        negative_count = base_query.filter(BotConversation.is_positive.is_(False)).count()
        neutral_count = base_query.filter(BotConversation.is_positive.is_(None)).count()

        feedback_total = positive_count + negative_count
        positive_ratio = (positive_count / feedback_total) if feedback_total else 0
        negative_ratio = (negative_count / feedback_total) if feedback_total else 0

        daily_rows = db.session.query(
            func.date(BotConversation.created_at).label('day'),
            func.count(BotConversation.id).label('total'),
            func.sum(case((BotConversation.is_positive.is_(True), 1), else_=0)).label('positive'),
            func.sum(case((BotConversation.is_positive.is_(False), 1), else_=0)).label('negative'),
            func.sum(case((BotConversation.is_positive.is_(None), 1), else_=0)).label('neutral')
        ).filter(
            BotConversation.created_at >= start_date
        ).group_by(
            func.date(BotConversation.created_at)
        ).order_by(
            func.date(BotConversation.created_at)
        ).all()

        daily_stats = [
            {
                "date": row.day.isoformat(),
                "total": int(row.total or 0),
                "positive": int(row.positive or 0),
                "negative": int(row.negative or 0),
                "neutral": int(row.neutral or 0),
            }
            for row in daily_rows
        ]

        summary = {
            "days": days,
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat(),
            "total_conversations": int(total_conversations),
            "feedback_total": int(feedback_total),
            "positive_count": int(positive_count),
            "negative_count": int(negative_count),
            "neutral_count": int(neutral_count),
            "positive_ratio": positive_ratio,
            "negative_ratio": negative_ratio,
        }

        return jsonify({
            "status": "success",
            "summary": summary,
            "daily": daily_stats
        }), 200

    except Exception as e:
        logger.error(f"Get chatbot stats error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get chatbot statistics"
        }), 500

@admin_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@admin_required
@rate_limit(requests_per_minute=30)
def delete_message(message_id):
    """Delete any message directly (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        message = Message.query.get(message_id)
        
        if not message:
            return jsonify({
                "status": "error",
                "message": "Message not found"
            }), 404
        
        message.is_deleted = True
        db.session.commit()
        
        logger.info(f"Message {message_id} deleted by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": "Message deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete message error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to delete message"
        }), 500

@admin_bp.route('/chatbot/conversations', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=60)
def get_chatbot_conversations():
    """Get all chatbot conversations with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        user_id = request.args.get('user_id', type=int)
        is_positive = request.args.get('is_positive', '')
        
        query = BotConversation.query.options(
            joinedload(BotConversation.user)
        )
        
        # Search filter
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                (BotConversation.user_message.ilike(search_term)) |
                (BotConversation.bot_response.ilike(search_term))
            )
        
        # User filter
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        # Feedback filter
        if is_positive.lower() in ['true', 'false']:
            query = query.filter_by(is_positive=is_positive.lower() == 'true')
        
        # Pagination
        paginated = query.order_by(BotConversation.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        conversations = [{
            "id": conv.id,
            "user_id": conv.user_id,
            "user": {
                "id": conv.user.id,
                "username": conv.user.username,
                "avatar_url": conv.user.avatar_url or ''
            } if conv.user else None,
            "user_message": conv.user_message,
            "bot_response": conv.bot_response,
            "is_positive": conv.is_positive,
            "created_at": conv.created_at.isoformat() if conv.created_at else None
        } for conv in paginated.items]
        
        return jsonify({
            "status": "success",
            "conversations": conversations,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated.total,
                "pages": paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get chatbot conversations error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get chatbot conversations"
        }), 500

@admin_bp.route('/users/<int:user_id>/ban-direct', methods=['POST'])
@admin_required
@rate_limit(requests_per_minute=20)
def ban_user_direct(user_id):
    """Ban user directly without report (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON data required"
            }), 400
            
        reason = data.get('reason', 'No reason provided')
        
        if str(user_id) == current_user_id:
            return jsonify({
                "status": "error",
                "message": "Cannot ban yourself"
            }), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404
        
        if user.role == 'admin' and str(user_id) != current_user_id:
            return jsonify({
                "status": "error",
                "message": "Cannot ban other administrators"
            }), 403
        
        user.is_banned = True
        db.session.commit()
        
        logger.info(f"User {user_id} ({user.username}) banned by admin {current_user_id}. Reason: {reason}")
        
        return jsonify({
            "status": "success",
            "message": f"User {user.username} banned successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Direct ban error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to ban user"
        }), 500

@admin_bp.route('/books/<int:book_id>', methods=['DELETE'])
@admin_required
@rate_limit(requests_per_minute=20)
def delete_book(book_id):
    """Delete a book (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        book = Book.query.get(book_id)
        if not book:
            return jsonify({
                "status": "error",
                "message": "Book not found"
            }), 404
        
        db.session.delete(book)
        db.session.commit()
        
        logger.info(f"Book {book_id} ('{book.title}') deleted by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": "Book deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete book error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to delete book"
        }), 500

@admin_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@admin_required
@rate_limit(requests_per_minute=30)
def delete_comment(comment_id):
    """Delete any comment (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        comment = BookComment.query.get(comment_id)
        
        if not comment:
            return jsonify({
                "status": "error",
                "message": "Comment not found"
            }), 404
        
        db.session.delete(comment)
        db.session.commit()
        
        logger.info(f"Comment {comment_id} deleted by admin {current_user_id}")
        
        return jsonify({
            "status": "success",
            "message": "Comment deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete comment error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to delete comment"
        }), 500

@admin_bp.route('/system/stats', methods=['GET'])
@admin_required
@rate_limit(requests_per_minute=30)
def get_system_stats():
    """Get system statistics"""
    try:
        # Database statistics
        db_stats = {
            "user_count": User.query.count(),
            "book_count": Book.query.count(),
            "message_count": Message.query.count(),
            "comment_count": BookComment.query.count(),
            "rating_count": BookRating.query.count(),
            "reading_history_count": ReadingHistory.query.count(),
            "bookmark_count": Bookmark.query.count(),
            "chat_count": BotConversation.query.count(),
            "active_users_last_7_days": db.session.query(ReadingHistory.user_id).filter(
                ReadingHistory.last_read_at >= datetime.utcnow() - timedelta(days=7)
            ).distinct().count()
        }
        
        # Database size (approximation for Neon DB)
        db_size = db.session.execute(
            db.text("SELECT pg_size_pretty(pg_database_size(current_database())) as db_size")
        ).scalar() or 'Unknown'
        db_stats['database_size'] = db_size
        
        # Recent activity (last 24 hours)
        recent_activity = []
        # Users
        recent_users = User.query.filter(
            User.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).order_by(User.created_at.desc()).limit(3).all()
        recent_activity.extend([{
            "type": "user",
            "title": user.username,
            "date": user.created_at.isoformat() if user.created_at else None
        } for user in recent_users])
        
        # Books
        recent_books = Book.query.filter(
            Book.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).order_by(Book.created_at.desc()).limit(3).all()
        recent_activity.extend([{
            "type": "book",
            "title": book.title,
            "date": book.created_at.isoformat() if book.created_at else None
        } for book in recent_books])
        
        # Comments
        recent_comments = BookComment.query.filter(
            BookComment.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).order_by(BookComment.created_at.desc()).limit(3).all()
        recent_activity.extend([{
            "type": "comment",
            "title": comment.content[:50],
            "date": comment.created_at.isoformat() if comment.created_at else None
        } for comment in recent_comments])
        
        recent_activity = sorted(recent_activity, key=lambda x: x['date'] or '', reverse=True)[:8]
        
        return jsonify({
            "status": "success",
            "system_stats": {
                **db_stats,
                "recent_activity": recent_activity
            }
        }), 200
        
    except Exception as e:
        logger.error(f"System stats error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to get system statistics"
        }), 500
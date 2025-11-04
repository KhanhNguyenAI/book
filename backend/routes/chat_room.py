# backend/routes/chat_room.py - COMPLETE VERSION WITH ROLES
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.chat_room import ChatRoom
from models.chat_room_member import ChatRoomMember
from models.user import User
from models.message import Message
from middleware.auth_middleware import admin_required, sanitize_input
from utils.error_handler import create_error_response
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
chat_room_bp = Blueprint('chat_room', __name__)

# ============================================
# HELPER FUNCTIONS
# ============================================

def room_to_dict(room, current_user_id=None, include_members=False):
    """Convert ChatRoom to dict with role info"""
    # Get owner info
    owner_member = ChatRoomMember.query.filter_by(
        room_id=room.id,
        role='owner'
    ).first()
    
    owner_info = None
    if owner_member and owner_member.user:
        owner_info = {
            'id': owner_member.user.id,
            'username': owner_member.user.username,
            'avatar_url': owner_member.user.avatar_url or ''
        }
    
    data = {
        'id': room.id,
        'name': room.name,
        'description': room.description or '',
        'is_global': room.is_global,
        'is_public': room.is_public,
        'room_type': room.get_room_type(),
        'created_at': room.created_at.isoformat() if room.created_at else None,
        'member_count': len(room.members) if room.members else 0,
        'message_count': Message.query.filter_by(room_id=room.id, is_deleted=False).count(),
        'your_role': None,
        'is_member': False,
        'owner': owner_info
    }
    
    # Check current user's role
    if current_user_id:
        if room.is_global:
            data['your_role'] = 'member'
            data['is_member'] = True
        else:
            member = ChatRoomMember.query.filter_by(
                user_id=current_user_id,
                room_id=room.id
            ).first()
            if member:
                data['your_role'] = member.role
                data['is_member'] = True
    
    # Include members with roles
    if include_members and room.members:
        data['members'] = [{
            'user_id': m.user_id,
            'username': m.user.username,
            'avatar_url': m.user.avatar_url or '',
            'role': m.role,
            'joined_at': m.joined_at.isoformat() if m.joined_at else None,
            'is_online': False  # TODO: Add online status
        } for m in room.members]
        
        # Sort members: owner -> admin -> member
        role_order = {'owner': 0, 'admin': 1, 'member': 2}
        data['members'].sort(key=lambda x: role_order.get(x['role'], 999))
    
    return data

def check_room_access(user_id, room_id, require_admin=False):
    """Check if user can access room - FIXED WITH AUTO-JOIN"""
    room = ChatRoom.query.get(room_id)
    if not room:
        return None, "Room not found"
    
    # ✅ Global room - everyone can access
    if room.is_global:
        return room, ""
    
    # Check membership
    member = ChatRoomMember.query.filter_by(
        user_id=user_id,
        room_id=room_id
    ).first()
    
    # ✅ FIX: Public room - auto-join if not member
    if room.is_public and not member:
        try:
            member = ChatRoomMember(
                room_id=room_id,
                user_id=user_id,
                role='member',
                joined_at=datetime.utcnow()
            )
            db.session.add(member)
            db.session.commit()
            logger.info(f"✅ Auto-joined user {user_id} to public room {room_id}")
            return room, ""
        except Exception as e:
            logger.error(f"❌ Auto-join failed: {str(e)}")
            db.session.rollback()
            return None, "Failed to join room"
    
    # ✅ Private room - must be member
    if not member:
        return None, "You are not a member of this room"
    
    # Check admin requirement
    if require_admin and member.role not in ['admin', 'owner']:
        return None, "Admin privileges required"
    
    return room, ""
# ============================================
# CREATE ROOM
# ============================================

@chat_room_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    """Create new chat room"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.is_banned:
            return create_error_response('Access denied', 403)
        
        data = request.get_json()
        name = sanitize_input(data.get('name', '').strip())
        description = sanitize_input(data.get('description', '').strip())
        is_public = data.get('is_public', False)
        
        if not name:
            return create_error_response('Room name is required', 400)
        
        if len(name) > 100:
            return create_error_response('Room name too long', 400)
        
        # Check duplicate name
        if ChatRoom.query.filter_by(name=name).first():
            return create_error_response('Room name already exists', 409)
        
        # Create room
        room = ChatRoom(
            name=name,
            description=description,
            is_global=False,
            is_public=is_public,
            created_at=datetime.utcnow()
        )
        db.session.add(room)
        db.session.flush()
        
        # Add creator as owner
        owner = ChatRoomMember(
            room_id=room.id,
            user_id=user_id,
            role='owner',
            joined_at=datetime.utcnow()
        )
        db.session.add(owner)
        db.session.commit()
        
        logger.info(f"✅ Room created: {room.id} ({room.get_room_type()}) by user {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Room created successfully',
            'room': room_to_dict(room, user_id, include_members=True)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating room: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# MEMBER MANAGEMENT
# ============================================

@chat_room_bp.route('/rooms/<int:room_id>/members', methods=['POST'])
@jwt_required()
def add_member(room_id):
    """Add member to room (admin/owner only)"""
    try:
        user_id = get_jwt_identity()
        
        # Check admin permission
        room, error = check_room_access(user_id, room_id, require_admin=True)
        if not room:
            return create_error_response(error, 403)
        
        data = request.get_json()
        target_username = sanitize_input(data.get('username', '').strip())
        role = data.get('role', 'member')  # member, admin
        
        if not target_username:
            return create_error_response('Username required', 400)
        
        if role not in ['member', 'admin']:
            return create_error_response('Invalid role', 400)
        
        # Find target user
        target_user = User.query.filter_by(username=target_username).first()
        if not target_user:
            return create_error_response('User not found', 404)
        
        if target_user.is_banned:
            return create_error_response('Cannot add banned user', 403)
        
        # Check if already member
        existing = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=target_user.id
        ).first()
        
        if existing:
            return create_error_response('User is already a member', 409)
        
        # Add member
        new_member = ChatRoomMember(
            room_id=room_id,
            user_id=target_user.id,
            role=role,
            joined_at=datetime.utcnow()
        )
        db.session.add(new_member)
        db.session.commit()
        
        logger.info(f"✅ User {target_user.id} added to room {room_id} as {role}")
        
        return jsonify({
            'status': 'success',
            'message': f'{target_username} added to room',
            'member': {
                'user_id': target_user.id,
                'username': target_user.username,
                'avatar_url': target_user.avatar_url,
                'role': role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding member: {str(e)}")
        return create_error_response(str(e), 500)

@chat_room_bp.route('/rooms/<int:room_id>/members/<int:member_id>/role', methods=['PUT'])
@jwt_required()
def update_member_role(room_id, member_id):
    """Update member role (owner only)"""
    try:
        user_id = get_jwt_identity()
        
        # Check if requester is owner
        requester = ChatRoomMember.query.filter_by(
            user_id=user_id,
            room_id=room_id
        ).first()
        
        if not requester or requester.role != 'owner':
            return create_error_response('Only owner can change roles', 403)
        
        data = request.get_json()
        new_role = data.get('role')
        
        if new_role not in ['member', 'admin']:
            return create_error_response('Invalid role', 400)
        
        # Find target member
        target = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=member_id
        ).first()
        
        if not target:
            return create_error_response('Member not found', 404)
        
        if target.role == 'owner':
            return create_error_response('Cannot change owner role', 403)
        
        target.role = new_role
        db.session.commit()
        
        logger.info(f"✅ User {member_id} role changed to {new_role} in room {room_id}")
        
        return jsonify({
            'status': 'success',
            'message': f'Role updated to {new_role}',
            'member': {
                'user_id': target.user_id,
                'username': target.user.username,
                'role': new_role
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating role: {str(e)}")
        return create_error_response(str(e), 500)

@chat_room_bp.route('/rooms/<int:room_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
def remove_member(room_id, member_id):
    """Remove member (admin/owner only)"""
    try:
        user_id = get_jwt_identity()
        
        # Check permissions
        requester = ChatRoomMember.query.filter_by(
            user_id=user_id,
            room_id=room_id
        ).first()
        
        if not requester or requester.role not in ['admin', 'owner']:
            return create_error_response('Insufficient permissions', 403)
        
        # Cannot remove yourself
        if member_id == user_id:
            return create_error_response('Use leave endpoint to leave room', 400)
        
        # Find target
        target = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=member_id
        ).first()
        
        if not target:
            return create_error_response('Member not found', 404)
        
        if target.role == 'owner':
            return create_error_response('Cannot remove owner', 403)
        
        # Admin cannot remove admin
        if requester.role == 'admin' and target.role == 'admin':
            return create_error_response('Only owner can remove admins', 403)
        
        db.session.delete(target)
        db.session.commit()
        
        logger.info(f"✅ User {member_id} removed from room {room_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Member removed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing member: {str(e)}")
        return create_error_response(str(e), 500)

@chat_room_bp.route('/rooms/<int:room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    """Leave room"""
    try:
        user_id = get_jwt_identity()
        
        room = ChatRoom.query.get(room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        if room.is_global:
            return create_error_response('Cannot leave global room', 400)
        
        member = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=user_id
        ).first()
        
        if not member:
            return create_error_response('You are not a member', 404)
        
        if member.role == 'owner':
            return create_error_response('Owner must transfer ownership or delete room', 403)
        
        db.session.delete(member)
        db.session.commit()
        
        logger.info(f"✅ User {user_id} left room {room_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Left room successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error leaving room: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# DELETE ROOM
# ============================================

@chat_room_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
@jwt_required()
def delete_room(room_id):
    """Delete room (owner only)"""
    try:
        user_id = get_jwt_identity()
        
        room = ChatRoom.query.get(room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        if room.is_global:
            return create_error_response('Cannot delete global room', 400)
        
        # Check if user is owner
        member = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=user_id
        ).first()
        
        if not member or member.role != 'owner':
            return create_error_response('Only owner can delete room', 403)
        
        # Delete room (cascade will delete members and messages)
        db.session.delete(room)
        db.session.commit()
        
        logger.info(f"✅ Room {room_id} deleted by owner {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Room deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting room: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# ROOM LISTING
# ============================================

@chat_room_bp.route('/rooms', methods=['GET'])
@jwt_required()
def get_rooms():
    """Get user's rooms"""
    try:
        user_id = get_jwt_identity()
        
        # Get rooms where user is member
        rooms_query = ChatRoom.query.join(ChatRoomMember)\
            .filter(ChatRoomMember.user_id == user_id)\
            .order_by(ChatRoom.is_global.desc(), ChatRoom.name.asc())
        
        rooms = [room_to_dict(room, user_id) for room in rooms_query.all()]
        
        # Always include global room
        global_room = ChatRoom.query.filter_by(is_global=True).first()
        if global_room and not any(r['id'] == global_room.id for r in rooms):
            rooms.insert(0, room_to_dict(global_room, user_id))
        
        return jsonify({
            'status': 'success',
            'rooms': rooms,
            'total': len(rooms)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting rooms: {str(e)}")
        return create_error_response(str(e), 500)

@chat_room_bp.route('/rooms/public', methods=['GET'])
@jwt_required()
def get_public_rooms():
    """Get public rooms for discovery"""
    try:
        user_id = get_jwt_identity()
        
        # Get all public rooms
        public_rooms = ChatRoom.query.filter_by(is_public=True)\
            .order_by(ChatRoom.created_at.desc()).all()
        
        rooms = [room_to_dict(room, user_id) for room in public_rooms]
        
        return jsonify({
            'status': 'success',
            'rooms': rooms,
            'total': len(rooms)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting public rooms: {str(e)}")
        return create_error_response(str(e), 500)

@chat_room_bp.route('/rooms/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room_details(room_id):
    """Get room details with members"""
    try:
        user_id = get_jwt_identity()
        
        room, error = check_room_access(user_id, room_id)
        if not room:
            return create_error_response(error, 403)
        
        return jsonify({
            'status': 'success',
            'room': room_to_dict(room, user_id, include_members=True)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting room details: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# JOIN PUBLIC ROOM
# ============================================

@chat_room_bp.route('/rooms/<int:room_id>/join', methods=['POST'])
@jwt_required()
def join_public_room(room_id):
    """Join a public room"""
    try:
        user_id = get_jwt_identity()
        
        room = ChatRoom.query.get(room_id)
        if not room:
            return create_error_response('Room not found', 404)
        
        if not room.is_public and not room.is_global:
            return create_error_response('Room is private', 403)
        
        # Check if already member
        existing = ChatRoomMember.query.filter_by(
            room_id=room_id,
            user_id=user_id
        ).first()
        
        if existing:
            return jsonify({
                'status': 'success',
                'message': 'Already a member',
                'room': room_to_dict(room, user_id)
            }), 200
        
        # Join room
        member = ChatRoomMember(
            room_id=room_id,
            user_id=user_id,
            role='member',
            joined_at=datetime.utcnow()
        )
        db.session.add(member)
        db.session.commit()
        
        logger.info(f"✅ User {user_id} joined public room {room_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Joined room successfully',
            'room': room_to_dict(room, user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error joining room: {str(e)}")
        return create_error_response(str(e), 500)
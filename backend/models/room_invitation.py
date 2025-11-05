# backend/models/room_invitation.py
from extensions import db
from datetime import datetime, timezone

class RoomInvitation(db.Model):
    __tablename__ = 'room_invitations'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    room = db.relationship('ChatRoom', backref='invitations')
    inviter = db.relationship('User', foreign_keys=[inviter_id], backref='sent_invitations')
    invitee = db.relationship('User', foreign_keys=[invitee_id], backref='received_invitations')
    
    def to_dict(self, include_room=False, include_users=False):
        data = {
            'id': self.id,
            'room_id': self.room_id,
            'inviter_id': self.inviter_id,
            'invitee_id': self.invitee_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None
        }
        
        if include_room and self.room:
            data['room'] = {
                'id': self.room.id,
                'name': self.room.name,
                'description': self.room.description
            }
        
        if include_users:
            if self.inviter:
                data['inviter'] = {
                    'id': self.inviter.id,
                    'username': self.inviter.username,
                    'avatar_url': self.inviter.avatar_url
                }
            if self.invitee:
                data['invitee'] = {
                    'id': self.invitee.id,
                    'username': self.invitee.username,
                    'avatar_url': self.invitee.avatar_url
                }
        
        return data
    
    __table_args__ = (
        db.Index('idx_room_invitation_room_id', 'room_id'),
        db.Index('idx_room_invitation_invitee_id', 'invitee_id'),
        db.Index('idx_room_invitation_status', 'status'),
        # ✅ Note: Unique constraint removed - we handle duplicate prevention in application logic
        # This allows re-inviting users after they reject or are removed
    )


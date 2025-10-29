from backend.extensions import db

from datetime import datetime, timezone

class ChatRoomMember(db.Model):
    __tablename__ = 'chat_room_members'
    
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role = db.Column(db.String(20), default='member')
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    room = db.relationship('ChatRoom', back_populates='members')
    user = db.relationship('User', back_populates='chat_room_members')
    
    def to_dict(self):
        return {
            'room_id': self.room_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
    
    __table_args__ = (
        db.Index('idx_chat_room_member_room_id_user_id', 'room_id', 'user_id'),
    )
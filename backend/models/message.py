from backend.extensions import db

from datetime import datetime, timezone

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text)
    image_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_deleted = db.Column(db.Boolean, default=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('messages.id', ondelete='CASCADE'))
    
    # Relationships - FIXED
    user = db.relationship('User', back_populates='messages')
    room = db.relationship('ChatRoom', back_populates='messages')
    
    # Self-referential relationship - SIMPLIFIED
    parent = db.relationship('Message', remote_side=[id], backref='replies')
    reports = db.relationship('MessageReport', back_populates='message', lazy='select')  # REMOVED cascade
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'room_id': self.room_id,
            'content': self.content,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_deleted': self.is_deleted,
            'parent_id': self.parent_id,
            'user': self.user.to_dict() if self.user else None,
            'replies': [reply.to_dict() for reply in self.replies]
        }
    
    __table_args__ = (
        db.CheckConstraint("content != '' OR image_url IS NOT NULL", name='check_content_or_image'),
        db.Index('idx_message_user_id_room_id', 'user_id', 'room_id'),
        db.Index('idx_message_parent_id', 'parent_id'),
    )
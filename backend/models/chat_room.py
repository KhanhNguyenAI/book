from backend.extensions import db

from datetime import datetime, timezone

class ChatRoom(db.Model):
    __tablename__ = 'chat_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    is_global = db.Column(db.Boolean, default=True)
    
    # Relationships
    messages = db.relationship('Message', back_populates='room', cascade='all, delete-orphan', lazy='select')
    members = db.relationship('ChatRoomMember', back_populates='room', cascade='all, delete-orphan', lazy='select')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_global': self.is_global
        }
    
    __table_args__ = (
        db.Index('idx_chat_room_name', 'name'),
        db.CheckConstraint("name != ''", name='check_name_not_empty'),
    )
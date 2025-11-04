# backend/models/chat_room.py - ENHANCED WITH is_public
from extensions import db
from datetime import datetime

class ChatRoom(db.Model):
    __tablename__ = 'chat_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_global = db.Column(db.Boolean, default=False)  # Global room (everyone auto-joined)
    is_public = db.Column(db.Boolean, default=False)  # ✅ NEW: Public room (anyone can join)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = db.relationship('Message', back_populates='room', cascade='all, delete-orphan', lazy='select')
    members = db.relationship('ChatRoomMember', back_populates='room', cascade='all, delete-orphan', lazy='select')
    
    def to_dict(self, include_members=False):
        """Enhanced to_dict with role info"""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_global': self.is_global,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_members:
            data['members'] = [member.to_dict() for member in self.members]
        
        return data
    
    def get_room_type(self):
        """Get human-readable room type"""
        if self.is_global:
            return 'global'
        elif self.is_public:
            return 'public'
        else:
            return 'private'
    
    __table_args__ = (
        db.Index('idx_chat_room_name', 'name'),
        db.Index('idx_chat_room_public', 'is_public'),
        db.CheckConstraint("name != ''", name='check_name_not_empty'),
    )
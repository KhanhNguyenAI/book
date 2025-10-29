from backend.extensions import db

from datetime import datetime, timezone

class BotConversation(db.Model):
    __tablename__ = 'bot_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    user_message = db.Column(db.Text, nullable=False)
    bot_response = db.Column(db.Text)
    is_positive = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', back_populates='bot_conversations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_message': self.user_message,
            'bot_response': self.bot_response,
            'is_positive': self.is_positive,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    __table_args__ = (
        db.CheckConstraint("user_message != ''", name='check_user_message_not_empty'),
        db.Index('idx_bot_conversation_user_id_created_at', 'user_id', 'created_at'),
    )
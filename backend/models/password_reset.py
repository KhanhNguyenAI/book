from backend.extensions import db

from datetime import datetime, timezone

class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.String(255), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_used = db.Column(db.Boolean, default=False)
    
    # Relationships
    user = db.relationship('User', back_populates='password_resets')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token': self.token,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_used': self.is_used
        }
    
    __table_args__ = (
        db.Index('idx_password_reset_user_id_token', 'user_id', 'token'),
    )
from extensions import db
from sqlalchemy.dialects.postgresql import JSONB

from datetime import datetime, timezone

class Recommendation(db.Model):
    __tablename__ = 'recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    query = db.Column(db.Text, nullable=False)
    recommended_books = db.Column(JSONB)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', back_populates='recommendations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'query': self.query,
            'recommended_books': self.recommended_books,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    __table_args__ = (
        db.CheckConstraint("query != ''", name='check_query_not_empty'),
        db.Index('idx_recommendation_user_id_created_at', 'user_id', 'created_at'),
    )
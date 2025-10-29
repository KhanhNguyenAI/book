from backend.extensions import db

from datetime import datetime, timezone

class BookRating(db.Model):
    __tablename__ = 'book_ratings'
    
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    review = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships - FIXED
    user = db.relationship('User', back_populates='ratings')
    book = db.relationship('Book', back_populates='ratings')
    
    def to_dict(self):
        return {
            'book_id': self.book_id,
            'user_id': self.user_id,
            'rating': self.rating,
            'review': self.review,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None
        }
    
    __table_args__ = (
        db.CheckConstraint('rating BETWEEN 1 AND 5', name='check_rating_range'),
        db.Index('idx_book_rating_book_id_user_id', 'book_id', 'user_id'),
    )
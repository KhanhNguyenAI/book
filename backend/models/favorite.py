from backend.extensions import db
from datetime import datetime, timezone

class Favorite(db.Model):
    __tablename__ = 'favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', back_populates='favorites')
    book = db.relationship('Book', back_populates='favorites')
    
    def to_dict(self, include_book=False, current_user_id=None):
        """
        Convert Favorite to dict
        Args:
            include_book: Include book details (default: False to avoid circular refs)
            current_user_id: Pass to book_to_dict if needed
        """
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        # CRITICAL: Only include book if explicitly requested
        if include_book and self.book:
            # Import here to avoid circular import
            from backend.routes.book import book_to_dict
            result['book'] = book_to_dict(
                self.book, 
                include_details=True,
                current_user_id=current_user_id
            )
        
        return result
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', name='unique_user_book_favorite'),
        db.Index('idx_favorite_user_id_book_id', 'user_id', 'book_id'),
    )
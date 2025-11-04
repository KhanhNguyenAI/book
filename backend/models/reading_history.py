from extensions import db

from datetime import datetime, timezone

class ReadingHistory(db.Model):
    __tablename__ = 'reading_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    last_page = db.Column(db.Integer, nullable=False)
    last_read_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', back_populates='reading_history')
    book = db.relationship('Book', back_populates='reading_history')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'last_page': self.last_page,
            'last_read_at': self.last_read_at.isoformat() if self.last_read_at else None,
            'book': self.book.to_dict() if self.book else None
        }
    
    __table_args__ = (
        db.CheckConstraint('last_page > 0', name='check_last_page_positive'),
        db.Index('idx_reading_history_user_id_book_id', 'user_id', 'book_id'),
    )
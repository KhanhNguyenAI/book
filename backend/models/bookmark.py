from backend.extensions import db
from datetime import datetime, timezone

class Bookmark(db.Model):
    __tablename__ = 'bookmarks'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    page_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    mark_note = db.Column(db.Text)
    
    # Relationships - FIXED
    user = db.relationship('User', back_populates='bookmarks')
    book = db.relationship('Book', back_populates='bookmarks')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'page_number': self.page_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'mark_note': self.mark_note,
            'book': self.book.to_dict() if self.book else None
        }
    
    __table_args__ = (
        db.CheckConstraint('page_number > 0', name='check_page_number_positive'),
        db.Index('idx_bookmark_user_id_book_id', 'user_id', 'book_id'),
    )
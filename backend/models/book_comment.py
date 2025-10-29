from backend.extensions import db
from datetime import datetime, timezone

class BookComment(db.Model):
    __tablename__ = 'book_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    parent_id = db.Column(db.Integer, db.ForeignKey('book_comments.id', ondelete='CASCADE'))
    
    # Relationships - COMPLETELY FIXED
    user = db.relationship('User', back_populates='comments')
    book = db.relationship('Book', back_populates='comments')
    
    # Self-referential relationship - SIMPLIFIED
    parent = db.relationship('BookComment', remote_side=[id], backref='replies')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'user_id': self.user_id,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'parent_id': self.parent_id,
            'user': self.user.to_dict() if self.user else None,
            'replies': [reply.to_dict() for reply in self.replies]
        }
    
    __table_args__ = (
        db.CheckConstraint("content != ''", name='check_content_not_empty'),
        db.Index('idx_book_comment_book_id_user_id', 'book_id', 'user_id'),
    )
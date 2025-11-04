# TRONG models/view_history.py
from extensions import db
from datetime import datetime, timezone

class ViewHistory(db.Model):
    __tablename__ = 'view_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), nullable=False)
    viewed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # ✅ ĐƠN GIẢN HOÁ - CHỈ CẦN foreign key, không cần relationship
    # Không cần: user = db.relationship('User', backref=db.backref('view_history', lazy=True))
    # Không cần: book = db.relationship('Book', backref=db.backref('view_history', lazy=True))
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', 'viewed_at', name='unique_user_book_view'),
    )
    
    def __repr__(self):
        return f'<ViewHistory user:{self.user_id} book:{self.book_id} at:{self.viewed_at}>'
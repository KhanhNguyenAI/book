from backend.extensions import db

from datetime import datetime

class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)

    __table_args__ = (
        db.CheckConstraint('rating BETWEEN 1 AND 5', name='check_rating_range'),
        db.UniqueConstraint('user_id', 'book_id', name='unique_user_book'),
    )

    def __repr__(self):
        return f"<Review user_id={self.user_id} book_id={self.book_id}>"
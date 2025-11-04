# models/chapter.py
from extensions import db

from datetime import datetime

class Chapter(db.Model):
    __tablename__ = 'chapters'
    
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    chapter_number = db.Column(db.Integer, nullable=False)
    chapter_title = db.Column(db.String(200))
    start_page = db.Column(db.Integer, nullable=False)
    page_count = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = db.Column(db.String(20), default='completed')  # 'completed', 'updating'
    
    # Relationships
    book = db.relationship('Book', back_populates='chapters')
    pages = db.relationship('BookPage', back_populates='chapter')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'chapter_number': self.chapter_number,
            'chapter_title': self.chapter_title,
            'start_page': self.start_page,
            'page_count': self.page_count,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def update_page_count(self):
        self.page_count = len(self.pages)
        db.session.commit()
    
    def mark_as_completed(self):
        self.status = 'completed'
        self.updated_at = datetime.utcnow()
        db.session.commit()
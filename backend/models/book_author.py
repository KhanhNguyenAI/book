from extensions import db


class BookAuthor(db.Model):
    __tablename__ = 'book_authors'
    
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey('authors.id', ondelete='CASCADE'), primary_key=True)
    
    # Relationships - FIXED
    book = db.relationship('Book', back_populates='book_authors')
    author = db.relationship('Author', back_populates='book_authors')
    
    def to_dict(self):
        return {
            'book_id': self.book_id,
            'author_id': self.author_id
        }
    
    __table_args__ = (
        db.Index('idx_book_author_book_id', 'book_id'),
        db.Index('idx_book_author_author_id', 'author_id'),
    )
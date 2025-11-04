from extensions import db


class BookPage(db.Model):
    __tablename__ = 'book_pages'
    
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    page_num = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.Text)
    content_text = db.Column(db.Text)
    content_type = db.Column(db.String(20), default='image')
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapters.id', ondelete='SET NULL'))
    is_final_page = db.Column(db.Boolean, default=False)
    
    # Relationships
    book = db.relationship('Book', back_populates='pages')
    chapter = db.relationship('Chapter', back_populates='pages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'page_num': self.page_num,
            'image_url': self.image_url,
            'content_text': self.content_text,
            'content_type': self.content_type,
            'chapter_id': self.chapter_id,
            'is_final_page': self.is_final_page
        }
    
    __table_args__ = (
        db.CheckConstraint("page_num > 0", name='check_page_num_positive'),
        db.Index('idx_book_page_book_id_page_num', 'book_id', 'page_num'),
    )
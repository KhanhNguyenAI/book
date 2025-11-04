from extensions import db


class Author(db.Model):
    __tablename__ = 'authors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    bio = db.Column(db.Text)
    photo_url = db.Column(db.String(255))
    
    # Relationships - FIXED
    book_authors = db.relationship('BookAuthor', back_populates='author', lazy='select', cascade='all, delete-orphan')

    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'bio': self.bio,
            'photo_url': self.photo_url
        }
    
    __table_args__ = (
        db.Index('idx_author_name', 'name'),  # Index cho tìm kiếm theo tên
    )
from backend.extensions import db
from datetime import datetime, timezone
from backend.models.book_rating import BookRating
from backend.models.favorite import Favorite
from sqlalchemy import or_, func
class Book(db.Model):
    __tablename__ = 'books'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, unique=True, index=True)
    # REMOVE OR DEPRECATE THIS: author = db.Column(db.String(255))
    isbn = db.Column(db.String(20), unique=True)
    publication_year = db.Column(db.Integer)
    description = db.Column(db.Text)
    pdf_path = db.Column(db.String(255))
    image_path = db.Column(db.String(255))
    cover_image = db.Column(db.String(255))
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    view_count = db.Column(db.Integer, default=0)
    volume_number = db.Column(db.Integer, default=1)
    total_volumes = db.Column(db.Integer, default=1)
    chapter_count = db.Column(db.Integer, default=0)
    page_count = db.Column(db.Integer, default=0)
    book_type = db.Column(db.String(20), default='single')
    series_name = db.Column(db.String(200))
    
    # Relationships
    category = db.relationship('Category', back_populates='books', lazy='select')
    book_authors = db.relationship('BookAuthor', back_populates='book', lazy='select', cascade='all, delete-orphan')
    pages = db.relationship('BookPage', back_populates='book', lazy='select', cascade='all, delete-orphan')
    ratings = db.relationship('BookRating', back_populates='book', lazy='select')
    comments = db.relationship('BookComment', back_populates='book', lazy='select')
    bookmarks = db.relationship('Bookmark', back_populates='book', lazy='select')
    reading_history = db.relationship('ReadingHistory', back_populates='book', lazy='select')
    chapters = db.relationship('Chapter', back_populates='book', lazy='select', cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', back_populates='book', lazy='select')
    
    # Proper SQLAlchemy relationship for authors
    authors = db.relationship(
        'Author',
        secondary='book_authors',
        viewonly=True,
        lazy='select'
    )
    
    @property
    def average_rating(self):
        if not self.ratings:
            return 0
        return sum(rating.rating for rating in self.ratings) / len(self.ratings)
    
    
    def update_book_stats(self):
        self.chapter_count = len(self.chapters)
        self.page_count = len(self.pages)
        db.session.commit()
    
    __table_args__ = (
        db.Index('idx_book_title', 'title'),
        db.Index('idx_book_category_id', 'category_id'),
        db.CheckConstraint("title != ''", name='check_title_not_empty'),
    )

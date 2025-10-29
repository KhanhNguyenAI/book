from backend.extensions import db


class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    
    # Relationships - FIXED
    books = db.relationship('Book', back_populates='category', lazy='select')
    preferences = db.relationship('UserPreference', back_populates='category', lazy='select')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }
    
    __table_args__ = (
        db.Index('idx_category_name', 'name'),
        db.CheckConstraint("name != ''", name='check_name_not_empty'),
    )
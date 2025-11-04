from extensions import db


class UserPreference(db.Model):
    __tablename__ = 'user_preferences'
    
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    is_notification_enabled = db.Column(db.Boolean, default=False)
    
    # Relationships
    category = db.relationship('Category', back_populates='preferences')
    user = db.relationship('User', back_populates='preferences')
    
    def to_dict(self):
        return {
            'category_id': self.category_id,
            'user_id': self.user_id,
            'is_notification_enabled': self.is_notification_enabled,
            'category': self.category.to_dict() if self.category else None
        }
    
    __table_args__ = (
        db.Index('idx_user_preference_user_id_category_id', 'user_id', 'category_id'),
    )
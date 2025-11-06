from extensions import db
from datetime import datetime, timezone

class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text)  # Nội dung bài viết
    image_url = db.Column(db.String(500))  # URL hình ảnh từ Supabase
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', backref='posts', lazy='select')
    
    def to_dict(self, include_user=True):
        """Convert Post object to dict"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content or '',
            'image_url': self.image_url or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'username': self.user.username,
                'avatar_url': self.user.avatar_url or '',
                'name': self.user.name or '',
            }
        
        return data
    
    __table_args__ = (
        db.Index('idx_post_user_created', 'user_id', 'created_at'),
    )


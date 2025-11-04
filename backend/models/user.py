from extensions import db

from datetime import datetime, timezone
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    role = db.Column(db.String(20), default='member')
    is_banned = db.Column(db.Boolean, default=False)
    avatar_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships - FIXED (removed problematic cascades)
    ratings = db.relationship('BookRating', back_populates='user', lazy='select')  # REMOVED cascade
    comments = db.relationship('BookComment', back_populates='user', lazy='select')  # REMOVED cascade
    messages = db.relationship('Message', back_populates='user', lazy='select')  # REMOVED cascade
    preferences = db.relationship('UserPreference', back_populates='user', lazy='select', cascade='all, delete-orphan')
    bookmarks = db.relationship('Bookmark', back_populates='user', lazy='select')  # REMOVED cascade
    reading_history = db.relationship('ReadingHistory', back_populates='user', lazy='select')  # REMOVED cascade
    bot_conversations = db.relationship('BotConversation', back_populates='user', lazy='select', cascade='all, delete-orphan')
    password_resets = db.relationship('PasswordReset', back_populates='user', lazy='select', cascade='all, delete-orphan')
    recommendations = db.relationship('Recommendation', back_populates='user', lazy='select', cascade='all, delete-orphan')
    reports_made = db.relationship('MessageReport', foreign_keys='MessageReport.reporter_id', back_populates='reporter', lazy='select')
    reports_resolved = db.relationship('MessageReport', foreign_keys='MessageReport.resolved_by', back_populates='resolver', lazy='select')
    chat_room_members = db.relationship('ChatRoomMember', back_populates='user', lazy='select')  # REMOVED cascade
    favorites = db.relationship('Favorite', back_populates='user', lazy='select')  # REMOVED cascade
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_banned': self.is_banned,
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @property
    def is_admin(self):
        return self.role == 'admin'
    
    __table_args__ = (
        db.Index('idx_user_username_email', 'username', 'email'),
        db.CheckConstraint("username != ''", name='check_username_not_empty'),
        db.CheckConstraint("email != ''", name='check_email_not_empty'),
    )
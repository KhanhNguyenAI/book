from extensions import db
from datetime import datetime, timezone, timedelta
import hashlib
import secrets

class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False, unique=True, index=True)
    family_id = db.Column(db.String(64), nullable=False, index=True)  # Để detect reuse
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_revoked = db.Column(db.Boolean, default=False, index=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    device_info = db.Column(db.String(255), nullable=True)  # User agent, IP, etc.
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', backref='refresh_tokens')
    
    @staticmethod
    def hash_token(token):
        """Hash token để lưu an toàn"""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
    
    @staticmethod
    def generate_family_id():
        """Generate family ID cho token family"""
        return secrets.token_urlsafe(32)
    
    @classmethod
    def create_token(cls, user_id, device_info=None):
        """Tạo refresh token mới"""
        # Generate token và family_id
        token = secrets.token_urlsafe(64)
        family_id = cls.generate_family_id()
        token_hash = cls.hash_token(token)
        
        # Tạo record
        refresh_token = cls(
            user_id=user_id,
            token_hash=token_hash,
            family_id=family_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            device_info=device_info
        )
        
        db.session.add(refresh_token)
        db.session.commit()
        
        return token, refresh_token
    
    @classmethod
    def validate_token(cls, token):
        """Validate refresh token và trả về token object nếu hợp lệ"""
        token_hash = cls.hash_token(token)
        token_obj = cls.query.filter_by(
            token_hash=token_hash,
            is_revoked=False
        ).first()
        
        if not token_obj:
            return None
        
        # Kiểm tra expiration
        expires_at = token_obj.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            return None
        
        return token_obj
    
    @classmethod
    def revoke_token(cls, token):
        """Revoke một token"""
        token_hash = cls.hash_token(token)
        token_obj = cls.query.filter_by(token_hash=token_hash).first()
        
        if token_obj:
            token_obj.is_revoked = True
            token_obj.revoked_at = datetime.now(timezone.utc)
            db.session.commit()
            return token_obj
        
        return None
    
    @classmethod
    def revoke_user_tokens(cls, user_id, exclude_family_id=None):
        """Revoke tất cả tokens của user (trừ family_id được exclude)"""
        query = cls.query.filter_by(user_id=user_id, is_revoked=False)
        
        if exclude_family_id:
            query = query.filter(cls.family_id != exclude_family_id)
        
        tokens = query.all()
        for token in tokens:
            token.is_revoked = True
            token.revoked_at = datetime.now(timezone.utc)
        
        db.session.commit()
        return len(tokens)
    
    @classmethod
    def check_reuse(cls, old_family_id, user_id):
        """
        Tạm thời vô hiệu hóa reuse detection do gây false-positive khi token được rotate hợp lệ.
        TODO: triển khai lại với cột trạng thái riêng cho lý do revoke.
        """
        return False
    
    def rotate_token(self, device_info=None):
        """Rotate token: tạo token mới cùng family_id, revoke token cũ"""
        # Kiểm tra reuse
        if RefreshToken.check_reuse(self.family_id, self.user_id):
            raise ValueError("Token reuse detected - all tokens revoked")
        
        # Revoke token cũ
        self.is_revoked = True
        self.revoked_at = datetime.now(timezone.utc)
        
        # Tạo token mới cùng family_id
        new_token = secrets.token_urlsafe(64)
        new_token_hash = self.hash_token(new_token)
        
        new_refresh_token = RefreshToken(
            user_id=self.user_id,
            token_hash=new_token_hash,
            family_id=self.family_id,  # Giữ nguyên family_id
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            device_info=device_info or self.device_info
        )
        
        db.session.add(new_refresh_token)
        db.session.commit()
        
        return new_token, new_refresh_token
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'family_id': self.family_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_revoked': self.is_revoked,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'device_info': self.device_info,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    __table_args__ = (
        db.Index('idx_refresh_token_user_id_revoked', 'user_id', 'is_revoked'),
        db.Index('idx_refresh_token_family_id', 'family_id'),
    )


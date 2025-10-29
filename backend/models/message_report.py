from backend.extensions import db

from datetime import datetime, timezone

class MessageReport(db.Model):
    __tablename__ = 'message_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False, index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    
    # Relationships - FIXED
    reporter = db.relationship('User', foreign_keys=[reporter_id], back_populates='reports_made')
    resolver = db.relationship('User', foreign_keys=[resolved_by], back_populates='reports_resolved')
    message = db.relationship('Message', back_populates='reports')
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'reporter_id': self.reporter_id,
            'reason': self.reason,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolved_by': self.resolved_by,
            'reporter': self.reporter.to_dict() if self.reporter else None,
            'resolver': self.resolver.to_dict() if self.resolver else None,
            'message': self.message.to_dict() if self.message else None
        }
    
    __table_args__ = (
        db.Index('idx_message_report_message_id_reporter_id', 'message_id', 'reporter_id'),
    )
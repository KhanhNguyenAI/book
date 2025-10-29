# create_admin.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.user import User

def create_admin_user():
    with app.app_context():
        try:
            print("🔧 Creating admin user...")
            
            # Kiểm tra xem admin đã tồn tại chưa
            existing_admin = User.query.filter_by(username='admin').first()
            if existing_admin:
                print("❌ Admin user already exists!")
                print(f"👤 Username: {existing_admin.username}")
                print(f"📧 Email: {existing_admin.email}")
                print(f"🎯 Role: {existing_admin.role}")
                return
            
            # Tạo admin user
            admin = User(
                username="admin",
                email="admin@library.com",
                role="admin",
                is_banned=False
            )
            admin.set_password("admin123")
            
            db.session.add(admin)
            db.session.commit()
            
            print("✅ Admin user created successfully!")
            print("👤 Username: admin")
            print("🔑 Password: admin123")
            print("📧 Email: admin@library.com")
            print("🎯 Role: admin")
            print("⚠️  Please change the password immediately!")
            
        except Exception as e:
            print(f"❌ Error creating admin: {e}")
            db.session.rollback()

if __name__ == "__main__":
    create_admin_user()
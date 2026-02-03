from app.db.session import SessionLocal
from app.db import models
from app.core import security

db = SessionLocal()

def seed_users():
    email = "admin@fairq.com"
    password = "admin"
    
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        print(f"User {email} already exists.")
        return

    hashed_password = security.get_password_hash(password)
    new_user = models.User(
        email=email,
        hashed_password=hashed_password,
        full_name="Admin User",
        role="admin"
    )
    db.add(new_user)
    db.commit()
    print(f"Created user: {email} / {password}")

if __name__ == "__main__":
    seed_users()

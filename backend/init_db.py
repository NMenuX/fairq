"""
Database initialization script.
Run this to set up a fresh database with default counters and admin user.

Usage: python init_db.py
"""
from app.db.session import engine, SessionLocal
from app.db.models import Base, Counter, User

def init_database():
    """Create all tables and seed with default data."""
    
    # Create tables
    Base.metadata.create_all(engine)
    print("✅ Database tables created")
    
    db = SessionLocal()
    
    try:
        # Check if counters exist
        existing_counters = db.query(Counter).count()
        if existing_counters == 0:
            # Create one counter per service type
            services = [
                'Deposits/Withdrawals',
                'Customer Service',
                'Loans',
                'Account Opening',
                'Cards & Services'
            ]
            
            for i, service in enumerate(services, 1):
                counter = Counter(
                    name=f'Counter {i}',
                    service_types=service,
                    active=True
                )
                db.add(counter)
            
            db.commit()
            print(f"✅ Created {len(services)} counters (one per service)")
        else:
            print(f"ℹ️ {existing_counters} counters already exist")
        
        # Note: User creation requires bcrypt which has Python 3.13 issues
        # For now, users must be created via the /auth/register API
        
        db.commit()
        print("✅ Database initialization complete!")
        
    finally:
        db.close()


if __name__ == "__main__":
    init_database()

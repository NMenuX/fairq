from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.db.models import Token


def seed() -> None:
    db = SessionLocal()
    try:
        # Clear existing tokens
        db.query(Token).delete()
        db.commit()
        print("Cleared existing tokens.")

        now = datetime.now(timezone.utc)
        service_types = [
            "Deposits/Withdrawals", 
            "Customer Service", 
            "Loans", 
            "Account Opening", 
            "Cards & Services"
        ]
        
        import random
        
        for i in range(30):
            # Random wait time between 0 and 60 minutes
            wait_mins = random.uniform(0, 60)
            created_at = now - timedelta(minutes=wait_mins)
            
            # Random vulnerability (skewed towards low, but some high)
            # 70% chance < 0.5, 30% chance >= 0.5
            if random.random() < 0.7:
                vuln = random.uniform(0.0, 0.4)
            else:
                vuln = random.uniform(0.5, 1.5)

            token = Token(
                number="TEMP",
                service_type=random.choice(service_types),
                vulnerability_score=round(vuln, 2),
                status="WAITING",
                created_at=created_at,
                updated_at=created_at,
            )
            db.add(token)
            db.flush()
            token.number = f"T-{token.id}"
        
        db.commit()
        
        print("Seeded 30 random tokens.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()



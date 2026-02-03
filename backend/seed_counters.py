"""
Seed script to create sample counters with service type assignments
"""
from app.db.session import SessionLocal
from app.db.models import Counter


def seed_counters() -> None:
    db = SessionLocal()
    try:
        # Check if counters already exist
        existing = db.query(Counter).count()
        if existing > 0:
            print(f"Counters already exist ({existing} counters). Skipping seed.")
            return

        # Define counters with their service types
        counters_data = [
            {
                "name": "Counter 1 - Deposits",
                "service_types": ["Deposits/Withdrawals"],
                "active": True,
            },
            {
                "name": "Counter 2 - Customer Service",
                "service_types": ["Customer Service", "Cards & Services"],
                "active": True,
            },
            {
                "name": "Counter 3 - Loans",
                "service_types": ["Loans"],
                "active": True,
            },
            {
                "name": "Counter 4 - Account Opening",
                "service_types": ["Account Opening"],
                "active": True,
            },
            {
                "name": "Counter 5 - Multi-Service",
                "service_types": ["Deposits/Withdrawals", "Customer Service", "Cards & Services"],
                "active": True,
            },
        ]

        for counter_data in counters_data:
            counter = Counter(
                name=counter_data["name"],
                active=counter_data["active"],
            )
            counter.set_service_types_list(counter_data["service_types"])
            db.add(counter)

        db.commit()
        print(f"Seeded {len(counters_data)} counters.")
    except Exception as e:
        print(f"Error seeding counters: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_counters()

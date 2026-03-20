from app.db.session import SessionLocal
from app.db import models
import sys
import os

# Ensure we can import from app
sys.path.append(os.getcwd())

def check_db():
    db = SessionLocal()
    try:
        tokens = db.query(models.Token).all()
        print(f"Total tokens found: {len(tokens)}")
        waiting = [t for t in tokens if t.status == 'WAITING']
        print(f"Waiting tokens found: {len(waiting)}")
        
        if len(tokens) > 0:
            print("First 3 tokens:")
            for t in tokens[:3]:
                print(f"ID: {t.id}, Number: {t.number}, Status: {t.status}, Created: {t.created_at}")
        else:
            print("No tokens found in database.")
            
    except Exception as e:
        print(f"Error querying database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()

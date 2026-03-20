"""
Migration script to update counters table with service_types column
"""
import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "fairq.db"
    if not db_path.exists():
        print("Database file not found. Run create_db.py first.")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if service_types column exists
        cursor.execute("PRAGMA table_info(counters)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'service_types' not in columns:
            print("Adding service_types column to counters table...")
            cursor.execute("ALTER TABLE counters ADD COLUMN service_types TEXT DEFAULT ''")
            conn.commit()
            print("Migration completed successfully!")
        else:
            print("service_types column already exists.")
        
        # Handle old capabilities column
        if 'capabilities' in columns:
            print("Removing old 'capabilities' column...")
            # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
            cursor.execute("""
                CREATE TABLE counters_new (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(50) UNIQUE NOT NULL,
                    service_types TEXT DEFAULT '',
                    active BOOLEAN DEFAULT 1
                )
            """)
            cursor.execute("""
                INSERT INTO counters_new (id, name, service_types, active)
                SELECT id, name, COALESCE(service_types, ''), active FROM counters
            """)
            cursor.execute("DROP TABLE counters")
            cursor.execute("ALTER TABLE counters_new RENAME TO counters")
            conn.commit()
            print("Old 'capabilities' column removed.")
            
    except Exception as e:
        print(f"Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

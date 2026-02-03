$env:DATABASE_URL = "sqlite:///./fairq.db"
.\.venv\Scripts\python create_db.py
.\.venv\Scripts\python seed.py
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload



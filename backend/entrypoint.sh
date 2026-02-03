#!/usr/bin/env sh
set -e

python /app/create_db.py

if [ "$SEED" = "1" ] || [ "$SEED" = "true" ]; then
	python /app/seed.py || true
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000



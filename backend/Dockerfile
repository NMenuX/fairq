FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy project metadata and install deps
COPY pyproject.toml /app/pyproject.toml
RUN pip install --upgrade pip && pip install -e .

# Copy app code
COPY app /app/app
COPY create_db.py /app/create_db.py
COPY seed.py /app/seed.py
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Data directory for SQLite
RUN mkdir -p /data
VOLUME ["/data"]

ENV DATABASE_URL=sqlite:////data/fairq.db

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]



FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy app code
# Copy all project files (respected by .dockerignore)
COPY . /app
RUN chmod +x /app/entrypoint.sh

# Install deps
RUN pip install --upgrade pip && pip install -e .

# Data directory for SQLite
RUN mkdir -p /data
VOLUME ["/data"]

ENV DATABASE_URL=sqlite:////data/fairq.db

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]



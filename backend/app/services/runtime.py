from contextlib import contextmanager
from typing import Iterator

from app.db.session import SessionLocal


@contextmanager
def session_scope() -> Iterator:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db() -> Iterator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



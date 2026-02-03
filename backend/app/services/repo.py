from sqlalchemy.orm import Session
from app.db import models


class TokenRepo:
    def __init__(self, db: Session):
        self.db = db

    def create(self, number: str, service_type: str, **kwargs) -> models.Token:
        token = models.Token(number=number, service_type=service_type, **kwargs)
        self.db.add(token)
        self.db.flush()
        return token

    def get(self, token_id: int) -> models.Token | None:
        return self.db.get(models.Token, token_id)



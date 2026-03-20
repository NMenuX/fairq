from app.db.base import Base
from app.db.session import engine
from app.db import models  # noqa: F401 ensure models imported


def main() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()



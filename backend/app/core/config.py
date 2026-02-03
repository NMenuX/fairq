from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/fairq"
    secret_key: str = "change-me"
    hash_salt: str = "fairq-salt"

    max_fairness_ratio: float = 1.5
    priority_boost_interval: int = 5

    class Config:
        env_file = ".env"
        env_prefix = ""


settings = Settings()



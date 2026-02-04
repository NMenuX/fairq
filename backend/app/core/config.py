"""
Application configuration using environment variables.
All sensitive values are loaded from .env file (never hardcoded).
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    See .env.example for all available options.
    """
    
    # ==========================================================================
    # SECURITY - Load from environment, never hardcode!
    # ==========================================================================
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"  # Override via SECRET_KEY env var
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # ==========================================================================
    # DATABASE
    # ==========================================================================
    database_url: str = "sqlite:///./fairq.db"
    
    # ==========================================================================
    # RATE LIMITING (requests per minute)
    # ==========================================================================
    rate_limit_public: int = 200  # General public endpoints (increased for demo)
    rate_limit_auth: int = 100    # Login/register endpoints (increased for demo)
    rate_limit_otp: int = 100     # OTP send endpoint (increased for demo)
    
    # ==========================================================================
    # SMS SERVICE
    # ==========================================================================
    sms_mock_mode: bool = True
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None
    
    # ==========================================================================
    # FAIRQ ALGORITHM
    # ==========================================================================
    max_fairness_ratio: float = 1.5
    priority_boost_interval: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance.
    Use this function to get settings throughout the app.
    """
    return Settings()


# Global settings instance for backward compatibility
settings = get_settings()

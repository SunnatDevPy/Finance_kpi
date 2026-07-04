from decimal import Decimal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://finance:finance@localhost:5432/finance_db"
    app_name: str = "Finance Management API"
    app_version: str = "0.1.0"

    jwt_secret: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 8

    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_full_name: str = "Administrator"
    monthly_plan: Decimal = Decimal("50000000")

    rate_limit_enabled: bool = True
    login_rate_limit: str = "10/minute"
    change_password_rate_limit: str = "5/minute"


settings = Settings()

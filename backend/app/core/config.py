from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ascertain Healthcare Dashboard API"
    environment: str = "development"

    # Local default keeps development easy before Docker/PostgreSQL is wired in.
    # Docker will override this with a PostgreSQL DATABASE_URL later.
    database_url: str = "sqlite:///./dev.db"

    seed_on_startup: bool = True
    seed_count: int = 120

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
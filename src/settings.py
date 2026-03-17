from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


BaseSettings.model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="allow"
)


class AppSettings(BaseSettings):
    base_url: str

    model_config = SettingsConfigDict(env_prefix="APP_")


class DatabaseSettings(BaseSettings):
    host: str
    port: int
    user: str
    password: SecretStr
    db: str

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password.get_secret_value()}@{self.host}:{self.port}/{self.db}"

    model_config = SettingsConfigDict(
        env_prefix="POSTGRES_"
    )


class SecuritySettings(BaseSettings):
    secret_key: SecretStr
    algorithm: SecretStr
    access_ttl: int = Field(alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_ttl: int = Field(alias="REFRESH_TOKEN_EXPIRE_DAYS")


class S3Settings(BaseSettings):
    access_key: str = Field(alias="MINIO_ROOT_USER")
    secret_key: SecretStr = Field(alias="MINIO_ROOT_PASSWORD")
    internal_endpoint: str = Field(alias="INTERNAL_ENDPOINT_URL")
    public_endpoint: str = Field(alias="PUBLIC_ENDPOINT_URL")


class RedisSettings(BaseSettings):
    host: str
    port: int

    celery_db: int

    @property
    def celery_url(self) -> str:
        return f"redis://{self.host}:{self.port}/{self.celery_db}"

    model_config = SettingsConfigDict(env_prefix="REDIS_")


class EmailSettings(BaseSettings):
    host: str
    port: int
    name: str
    password: SecretStr
    from_email: str

    model_config = SettingsConfigDict(env_prefix="EMAIL_")


class Settings(BaseSettings):
    app: AppSettings = Field(default_factory=AppSettings)
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    s3: S3Settings = Field(default_factory=S3Settings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    email: EmailSettings = Field(default_factory=EmailSettings)


settings = Settings()

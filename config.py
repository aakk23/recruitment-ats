# config.py
"""
Central configuration — reads environment variables with sensible defaults.
Import from here instead of calling os.environ directly in routes/services.

Usage:
    from config import settings
    print(settings.storage_backend)

To override, set env vars before starting the server, or create a .env file
and load it with python-dotenv:
    pip install python-dotenv
    # add  from dotenv import load_dotenv; load_dotenv()  at the top of main.py
"""

import os


class Settings:
    # ── Storage ───────────────────────────────────────────────────────────────
    storage_backend: str = os.environ.get("STORAGE_BACKEND", "local")   # "local" | "s3"
    local_upload_dir: str = os.environ.get("LOCAL_UPLOAD_DIR", "uploads")

    # S3 (only needed when storage_backend == "s3")
    aws_access_key_id: str = os.environ.get("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    aws_region: str = os.environ.get("AWS_REGION", "ap-south-1")
    s3_bucket_name: str = os.environ.get("S3_BUCKET_NAME", "")

    # ── Auth ──────────────────────────────────────────────────────────────────
    secret_key: str = os.environ.get("SECRET_KEY", "change-me-in-production")
    access_token_expire_minutes: int = int(
        os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # ── Database ──────────────────────────────────────────────────────────────
    db_name: str = os.environ.get("DB_NAME", "ATS_DB")
    db_user: str = os.environ.get("DB_USER", "postgres")
    db_password: str = os.environ.get("DB_PASSWORD", "0112")
    db_host: str = os.environ.get("DB_HOST", "localhost")
    db_port: int = int(os.environ.get("DB_PORT", "5432"))

    # ── Server ────────────────────────────────────────────────────────────────
    cors_origins: list = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")


settings = Settings()
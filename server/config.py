import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / 'attendance.db'


def get_database_uri():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    if database_url.startswith('postgres://'):
        return database_url.replace('postgres://', 'postgresql://', 1)
    if database_url.startswith('postgresql://'):
        return database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    return database_url


def should_auto_sync_schema():
    value = os.getenv('AUTO_SYNC_SCHEMA')
    if value is not None:
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return not bool(os.getenv('DATABASE_URL'))


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'super-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_SYNC_SCHEMA = should_auto_sync_schema()
    JWT_EXPIRATION_HOURS = 24

"""PostgreSQL connection pooling and transaction helpers."""

import os
from contextlib import contextmanager
from pathlib import Path
from threading import Lock

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool


_pool = None
_pool_lock = Lock()
DATABASE_MODULE_FILE = Path(__file__)
DATABASE_MODULE_FILE = DATABASE_MODULE_FILE.resolve()
REPOSITORY_DIRECTORY = DATABASE_MODULE_FILE.parents[3]
ENVIRONMENT_FILE = REPOSITORY_DIRECTORY / ".env"


def _connection_settings() -> dict[str, str]:
    """Read PostgreSQL settings from the environment and return connection options."""
    load_dotenv(dotenv_path=ENVIRONMENT_FILE)

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return {"dsn": database_url}

    password = os.getenv("DB_PASSWORD")
    if not password:
        raise RuntimeError(
            "Database configuration is missing. Set DATABASE_URL or DB_PASSWORD."
        )

    settings = {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME", "mediscan_db"),
        "user": os.getenv("DB_USER", "mediscan_admin"),
        "password": password,
    }
    return settings


def get_pool() -> SimpleConnectionPool:
    """Create the connection pool once and return it."""
    global _pool

    if _pool is None:
        with _pool_lock:
            if _pool is None:
                settings = _connection_settings()
                _pool = SimpleConnectionPool(1, 10, **settings)
    return _pool


def get_connection():
    """Get one connection from the shared PostgreSQL pool."""
    pool = get_pool()
    connection = pool.getconn()
    return connection


def return_connection(connection) -> None:
    """Return a connection to the shared pool."""
    pool = get_pool()
    pool.putconn(connection)


@contextmanager
def connection_cursor():
    """Yield a dictionary cursor and commit or roll back its transaction."""
    connection = get_connection()
    cursor = None
    try:
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        yield cursor
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    finally:
        try:
            if cursor is not None:
                cursor.close()
        finally:
            return_connection(connection)


def close_pool() -> None:
    """Close all pooled connections and allow the pool to be created again."""
    global _pool

    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None
# PostgreSQL connection & AsyncSession engine

import os
from collections.abc import AsyncIterator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def _database_url() -> str | None:
    environment_file = Path(__file__).resolve().parents[3] / ".env"
    load_dotenv(dotenv_path=environment_file)
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    return url


_url = _database_url()
engine = create_async_engine(_url, pool_pre_ping=True) if _url else None
SessionLocal = (
    async_sessionmaker(engine, expire_on_commit=False) if engine is not None else None
)


async def get_db() -> AsyncIterator[AsyncSession | None]:
    """Yield a request-scoped database session when database configuration exists."""
    if SessionLocal is None:
        yield None
        return

    async with SessionLocal() as session:
        yield session
# (Kenshin)

# PostgreSQL connection & AsyncSession engine

import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def _database_url() -> str | None:
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
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.engine import engine

SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
WRITE_LOCK_KEY = 0x41544C4153


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return SessionFactory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session


@asynccontextmanager
async def write_transaction(
    session_factory: async_sessionmaker[AsyncSession] = SessionFactory,
) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        async with session.begin():
            await session.execute(func.pg_advisory_xact_lock(WRITE_LOCK_KEY))
            yield session


async def get_write_session() -> AsyncIterator[AsyncSession]:
    async with write_transaction() as session:
        yield session

import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path

import asyncpg  # type: ignore[import-untyped]
import pytest
from database_support import require_test_database_url

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _test_database_url() -> str:
    source_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://atlas:atlas-local-only@127.0.0.1:5432/atlas_test",
    )
    return require_test_database_url(source_url)


async def _ensure_test_database(database_url: str) -> None:
    from sqlalchemy.engine import make_url

    url = make_url(require_test_database_url(database_url))
    database_name = url.database
    if database_name is None:
        raise RuntimeError("DATABASE_URL precisa informar o nome do banco de teste.")

    connection = await asyncpg.connect(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        database="postgres",
    )
    try:
        database_exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            database_name,
        )
        if not database_exists:
            safe_database_name = database_name.replace('"', '""')
            await connection.execute(f'CREATE DATABASE "{safe_database_name}"')
    finally:
        await connection.close()


def _run_migration(database_url: str, direction: str, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    subprocess.run(
        [sys.executable, "-m", "alembic", direction, revision],
        cwd=BACKEND_ROOT,
        env=environment,
        check=True,
    )


@pytest.fixture(scope="session")
def test_database_url() -> Iterator[str]:
    import asyncio

    database_url = _test_database_url()
    asyncio.run(_ensure_test_database(database_url))

    _run_migration(database_url, "downgrade", "base")
    _run_migration(database_url, "upgrade", "head")
    try:
        yield database_url
    finally:
        _run_migration(database_url, "downgrade", "base")


@pytest.fixture
def ensure_test_database_name(test_database_url: str) -> str:
    return require_test_database_url(test_database_url)

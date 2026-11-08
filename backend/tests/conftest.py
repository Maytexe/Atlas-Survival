import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path

import asyncpg  # type: ignore[import-untyped]
import pytest
from sqlalchemy.engine import make_url

TEST_DATABASE_NAME = "atlas_test"
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _test_database_url() -> str:
    source_url = make_url(
        os.environ.get(
            "DATABASE_URL",
            "postgresql+asyncpg://atlas:atlas-local-only@127.0.0.1:5432/atlas",
        )
    )
    return source_url.set(database=TEST_DATABASE_NAME).render_as_string(hide_password=False)


async def _ensure_test_database(database_url: str) -> None:
    url = make_url(database_url)
    if url.database != TEST_DATABASE_NAME:
        raise RuntimeError("Os testes só podem usar o banco atlas_test.")

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
            TEST_DATABASE_NAME,
        )
        if not database_exists:
            await connection.execute('CREATE DATABASE "atlas_test"')
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
    if make_url(test_database_url).database != TEST_DATABASE_NAME:
        raise RuntimeError("Os testes só podem usar o banco atlas_test.")
    return test_database_url

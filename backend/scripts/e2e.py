import os
import re
import secrets
import subprocess
import sys
from pathlib import Path

from sqlalchemy.engine import URL, make_url

from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
E2E_DATABASE_NAME = os.environ.get("E2E_DATABASE_NAME", "atlas_e2e_test")


def psql(query: str, *, capture_output: bool = False) -> subprocess.CompletedProcess[str]:
    url = make_url(settings.database_url)
    if url.username is None:
        raise RuntimeError("DATABASE_URL precisa informar o usuário do PostgreSQL.")
    return subprocess.run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "postgres",
            "psql",
            "-U",
            url.username,
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-tA",
        ],
        cwd=PROJECT_ROOT,
        input=query,
        check=True,
        capture_output=capture_output,
        text=True,
    )


def prepare_database(source_url: URL) -> str:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", E2E_DATABASE_NAME) or E2E_DATABASE_NAME in {
        source_url.database,
        "atlas_test",
    }:
        raise RuntimeError("O banco E2E precisa ser exclusivo e terminar em _test.")
    role_exists = (
        psql(
            f"SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{E2E_DATABASE_NAME}')",
            capture_output=True,
        ).stdout.strip()
        == "t"
    )
    password = secrets.token_hex(32)
    role_action = "ALTER ROLE" if role_exists else "CREATE ROLE"
    psql(f"{role_action} {E2E_DATABASE_NAME} WITH LOGIN CREATEDB PASSWORD '{password}'")

    database_exists = (
        psql(
            f"SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = '{E2E_DATABASE_NAME}')",
            capture_output=True,
        ).stdout.strip()
        == "t"
    )
    if database_exists:
        psql(f"ALTER DATABASE {E2E_DATABASE_NAME} OWNER TO {E2E_DATABASE_NAME}")
    else:
        psql(f"CREATE DATABASE {E2E_DATABASE_NAME} OWNER {E2E_DATABASE_NAME}")
    return source_url.set(
        username=E2E_DATABASE_NAME,
        password=password,
        database=E2E_DATABASE_NAME,
    ).render_as_string(hide_password=False)


def main() -> int:
    if settings.environment != "development":
        raise RuntimeError("A suíte E2E só pode ser iniciada em desenvolvimento.")
    source_url = make_url(settings.database_url)
    e2e_url = prepare_database(source_url)
    environment = os.environ.copy()
    environment["DATABASE_URL"] = e2e_url
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        env=environment,
        check=True,
    )
    subprocess.run(
        ["cmd.exe", "/d", "/c", "npm.cmd --prefix frontend run build"],
        cwd=PROJECT_ROOT,
        env=environment,
        check=True,
    )
    return subprocess.run(
        ["cmd.exe", "/d", "/c", "npm.cmd --prefix frontend run e2e"],
        cwd=PROJECT_ROOT,
        env=environment,
        check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())

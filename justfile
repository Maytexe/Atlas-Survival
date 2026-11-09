set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

default:
    @Write-Host "ATLAS: use 'just dev', 'just backend-check', 'just frontend-check' or 'just all'"

dev:
    docker compose up -d
    Start-Process -FilePath 'powershell.exe' -WorkingDirectory (Get-Location).Path -ArgumentList @('-NoLogo', '-NoProfile', '-NoExit', '-Command', 'just backend-dev') -PassThru | Select-Object -ExpandProperty Id
    Start-Process -FilePath 'powershell.exe' -WorkingDirectory (Get-Location).Path -ArgumentList @('-NoLogo', '-NoProfile', '-NoExit', '-Command', 'just frontend-dev') -PassThru | Select-Object -ExpandProperty Id

backend-dev:
    uv run --directory backend uvicorn app.main:app --reload --host 127.0.0.1

frontend-dev:
    npm --prefix frontend run dev -- --host 127.0.0.1

test:
    uv run --directory backend pytest
    npm --prefix frontend run test

lint:
    uv run --directory backend ruff check .
    npm --prefix frontend run lint
    npm --prefix frontend run format:check

db-up:
    docker compose up -d

migrate:
    uv run --directory backend alembic upgrade head

openapi:
    uv run --directory backend python scripts/export_openapi.py

types:
    npm --prefix frontend run types

backend-check:
    uv run --directory backend ruff check .
    uv run --directory backend mypy .
    uv run --directory backend pytest

frontend-check:
    npm --prefix frontend run lint
    npm --prefix frontend run format:check
    npm --prefix frontend run typecheck
    npm --prefix frontend run types:check
    npm --prefix frontend run test
    npm --prefix frontend run build

e2e:
    docker compose up -d
    uv run --directory backend python scripts/e2e.py

all: backend-check frontend-check

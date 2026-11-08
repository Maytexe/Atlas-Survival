import asyncio
import uuid
from collections.abc import AsyncIterator, Generator
from datetime import date
from typing import cast

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.dependencies import get_today
from app.db.session import get_session, get_session_factory, get_write_session, write_transaction
from app.main import app


@pytest.fixture
def api_app(ensure_test_database_name: str) -> Generator[FastAPI, None, None]:
    engine = create_async_engine(ensure_test_database_name, poolclass=NullPool)
    test_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def reset_database() -> None:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "TRUNCATE TABLE processed_mutations, stock_batches, "
                    "inventory_items, household_members, categories"
                )
            )

    asyncio.run(reset_database())

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with test_factory() as session:
            yield session

    async def override_write_session() -> AsyncIterator[AsyncSession]:
        async with write_transaction(test_factory) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_write_session] = override_write_session
    app.dependency_overrides[get_session_factory] = lambda: test_factory
    app.dependency_overrides[get_today] = lambda: date(2026, 1, 15)

    try:
        yield app
    finally:
        app.dependency_overrides.clear()
        asyncio.run(reset_database())
        asyncio.run(engine.dispose())


async def _create_category(client: httpx.AsyncClient, name: str) -> str:
    response = await client.post("/api/categories", json={"name": name})
    assert response.status_code == 201
    return cast(str, response.json()["id"])


async def _create_item(
    client: httpx.AsyncClient,
    category_id: str,
    *,
    name: str = "Item API de teste",
) -> str:
    response = await client.post(
        "/api/inventory",
        json={
            "name": name,
            "category_id": category_id,
            "item_kind": "FOOD",
            "unit": "kg",
            "daily_consumption": "1.250",
            "consumption_basis": "HOUSEHOLD",
        },
    )
    assert response.status_code == 201
    return cast(str, response.json()["id"])


@pytest.mark.anyio
async def test_invalid_batch_quantity_returns_problem_details(api_app: FastAPI) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        category_id = await _create_category(client, "Categoria API quantidade")
        item_id = await _create_item(client, category_id)
        response = await client.post(
            f"/api/inventory/{item_id}/batches",
            json={"quantity": "-0.001"},
        )
        numeric_quantity = await client.post(
            f"/api/inventory/{item_id}/batches",
            json={"quantity": 0.5},
        )

    assert response.status_code == 422
    assert numeric_quantity.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["title"] == "Dados inválidos"
    assert response.json()["detail"]


@pytest.mark.anyio
async def test_batch_for_missing_item_returns_problem_404(api_app: FastAPI) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            f"/api/inventory/{uuid.uuid4()}/batches",
            json={"quantity": "1.000"},
        )

    assert response.status_code == 404
    assert response.json()["title"] == "Não encontrado"


@pytest.mark.anyio
async def test_active_category_with_items_cannot_be_deleted(api_app: FastAPI) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        category_id = await _create_category(client, "Categoria protegida")
        await _create_item(client, category_id)
        response = await client.delete(f"/api/categories/{category_id}")

    assert response.status_code == 409
    assert response.json()["title"] == "Conflito"


@pytest.mark.anyio
async def test_item_deletion_tombstones_item_and_all_batches(api_app: FastAPI) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        category_id = await _create_category(client, "Categoria tombstone")
        item_id = await _create_item(client, category_id)
        batch_response = await client.post(
            f"/api/inventory/{item_id}/batches",
            json={"quantity": "2.500"},
        )
        assert batch_response.status_code == 201
        batch_id = batch_response.json()["id"]
        response = await client.delete(f"/api/inventory/{item_id}")
        pulled = await client.get("/api/sync/pull", params={"cursor": 0})

    assert response.status_code == 204
    assert pulled.status_code == 200
    body = pulled.json()
    item = next(row for row in body["inventory_items"] if row["id"] == item_id)
    batch = next(row for row in body["stock_batches"] if row["id"] == batch_id)
    assert item["deleted_at"] is not None
    assert batch["deleted_at"] is not None
    assert batch["quantity"] == "2.500"


@pytest.mark.anyio
async def test_sync_push_is_idempotent_and_server_never_returns_blocked(
    api_app: FastAPI,
) -> None:
    mutation_id = str(uuid.uuid4())
    category_id = str(uuid.uuid4())
    mutation = {
        "id": mutation_id,
        "entity": "categories",
        "op": "CREATE",
        "entity_id": category_id,
        "payload": {"name": "Categoria sincronizada"},
        "client_ts": "2026-01-15T12:00:00Z",
    }

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        first = await client.post("/api/sync/push", json={"mutations": [mutation]})
        duplicate = await client.post("/api/sync/push", json={"mutations": [mutation]})
        invalid = await client.post(
            "/api/sync/push",
            json={
                "mutations": [
                    {
                        **mutation,
                        "id": str(uuid.uuid4()),
                        "entity_id": str(uuid.uuid4()),
                        "payload": {"name": "Categoria inválida", "unexpected": True},
                    }
                ]
            },
        )

    assert first.json()["results"][0]["status"] == "applied"
    assert duplicate.json()["results"][0]["status"] == "duplicate"
    assert invalid.json()["results"][0]["status"] == "rejected"
    assert "blocked" not in {
        result["status"]
        for response in (first, duplicate, invalid)
        for result in response.json()["results"]
    }


@pytest.mark.anyio
async def test_sync_update_of_deleted_record_is_stale(api_app: FastAPI) -> None:
    category_id = str(uuid.uuid4())
    create_id = str(uuid.uuid4())
    delete_id = str(uuid.uuid4())
    update_id = str(uuid.uuid4())
    mutations = [
        {
            "id": create_id,
            "entity": "categories",
            "op": "CREATE",
            "entity_id": category_id,
            "payload": {"name": "Categoria excluída"},
            "client_ts": "2026-01-15T12:00:00Z",
        },
        {
            "id": delete_id,
            "entity": "categories",
            "op": "DELETE",
            "entity_id": category_id,
            "payload": {},
            "client_ts": "2026-01-15T12:01:00Z",
        },
        {
            "id": update_id,
            "entity": "categories",
            "op": "UPDATE",
            "entity_id": category_id,
            "payload": {"name": "Nao deve restaurar"},
            "client_ts": "2026-01-15T12:02:00Z",
        },
    ]

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/sync/push", json={"mutations": mutations})

    assert [result["status"] for result in response.json()["results"]] == [
        "applied",
        "applied",
        "stale",
    ]


@pytest.mark.anyio
async def test_adjust_is_atomic_and_does_not_change_client_updated_at(
    api_app: FastAPI,
) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        category_id = await _create_category(client, "Categoria ajuste")
        item_id = await _create_item(client, category_id)
        batch_response = await client.post(
            f"/api/inventory/{item_id}/batches",
            json={"quantity": "2.000"},
        )
        batch_id = batch_response.json()["id"]
        original_client_updated_at = batch_response.json()["client_updated_at"]
        mutation = {
            "id": str(uuid.uuid4()),
            "entity": "stock_batches",
            "op": "ADJUST",
            "entity_id": batch_id,
            "payload": {"delta": "-0.500"},
            "client_ts": "2020-01-01T00:00:00Z",
        }
        adjusted = await client.post("/api/sync/push", json={"mutations": [mutation]})
        current_batch = await client.get(f"/api/batches/{batch_id}")
        rejected_adjust = await client.post(
            "/api/sync/push",
            json={
                "mutations": [
                    {
                        **mutation,
                        "id": str(uuid.uuid4()),
                        "payload": {"delta": "-2.000"},
                    },
                    {
                        **mutation,
                        "id": str(uuid.uuid4()),
                        "payload": {"delta": 0.25},
                    },
                ]
            },
        )

    assert adjusted.json()["results"][0]["status"] == "applied"
    assert current_batch.json()["quantity"] == "1.500"
    assert current_batch.json()["client_updated_at"] == original_client_updated_at
    assert [result["status"] for result in rejected_adjust.json()["results"]] == [
        "rejected",
        "rejected",
    ]


@pytest.mark.anyio
async def test_rejected_mutation_savepoint_does_not_block_later_mutation(
    api_app: FastAPI,
) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        await _create_category(client, "Nome já utilizado")
        rejected = {
            "id": str(uuid.uuid4()),
            "entity": "categories",
            "op": "CREATE",
            "entity_id": str(uuid.uuid4()),
            "payload": {"name": "Nome já utilizado"},
            "client_ts": "2026-01-15T12:00:00Z",
        }
        applied = {
            **rejected,
            "id": str(uuid.uuid4()),
            "entity_id": str(uuid.uuid4()),
            "payload": {"name": "Nome posterior"},
        }
        response = await client.post(
            "/api/sync/push",
            json={"mutations": [rejected, applied]},
        )
        categories = await client.get("/api/categories")

    assert [result["status"] for result in response.json()["results"]] == [
        "rejected",
        "applied",
    ]
    assert {category["name"] for category in categories.json()} == {
        "Nome já utilizado",
        "Nome posterior",
    }


@pytest.mark.anyio
async def test_dashboard_and_alerts_use_injected_today_and_decimal_strings(
    api_app: FastAPI,
) -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=api_app),
        base_url="http://test",
    ) as client:
        category_id = await _create_category(client, "Categoria dashboard")
        item_id = await _create_item(client, category_id)
        batch = await client.post(
            f"/api/inventory/{item_id}/batches",
            json={
                "quantity": "0.500",
                "expiration_date": "2026-01-15",
            },
        )
        dashboard = await client.get("/api/dashboard")
        alerts = await client.get("/api/alerts")

    assert batch.status_code == 201
    assert batch.json()["quantity"] == "0.500"
    assert dashboard.json()["today"] == "2026-01-15"
    assert dashboard.json()["availability"]["FOOD:MASS"]["available"] == "500.000"
    assert any(alert["type"] == "EXPIRING_SOON" for alert in alerts.json())
    assert any(alert["type"] == "LOW_STOCK" for alert in alerts.json())

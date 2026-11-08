import asyncio
import uuid
from collections.abc import Awaitable, Callable
from decimal import Decimal

import pytest
from sqlalchemy import delete, insert, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.sql import Executable

from app.db.session import write_transaction
from app.models import (
    Category,
    ConsumptionBasis,
    InventoryItem,
    ItemKind,
    StockBatch,
    Unit,
)


def _run_isolated[T](
    database_url: str,
    operation: Callable[[AsyncConnection], Awaitable[T]],
) -> T:
    async def run() -> T:
        engine = create_async_engine(database_url, poolclass=NullPool)
        try:
            async with engine.connect() as connection:
                transaction = await connection.begin()
                try:
                    return await operation(connection)
                finally:
                    await transaction.rollback()
        finally:
            await engine.dispose()

    return asyncio.run(run())


async def _expect_integrity_error(
    connection: AsyncConnection,
    statement: Executable,
) -> None:
    with pytest.raises(IntegrityError):
        async with connection.begin_nested():
            await connection.execute(statement)


async def _insert_category(
    connection: AsyncConnection,
    name: str,
) -> uuid.UUID:
    category_id = uuid.uuid4()
    await connection.execute(insert(Category).values(id=category_id, name=name))
    return category_id


async def _insert_item(
    connection: AsyncConnection,
    category_id: uuid.UUID,
) -> uuid.UUID:
    item_id = uuid.uuid4()
    await connection.execute(
        insert(InventoryItem).values(
            id=item_id,
            name="Item ficticio de teste",
            category_id=category_id,
            item_kind=ItemKind.FOOD,
            unit=Unit.KG,
            daily_consumption=Decimal("1.000"),
            consumption_basis=ConsumptionBasis.HOUSEHOLD,
        )
    )
    return item_id


def test_postgres_rejects_negative_batch_quantity(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        category_id = await _insert_category(connection, "Categoria quantidade")
        item_id = await _insert_item(connection, category_id)
        await _expect_integrity_error(
            connection,
            insert(StockBatch).values(
                inventory_item_id=item_id,
                quantity=Decimal("-0.001"),
            ),
        )

    _run_isolated(ensure_test_database_name, operation)


def test_postgres_rejects_negative_daily_consumption(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        category_id = await _insert_category(connection, "Categoria consumo")
        await _expect_integrity_error(
            connection,
            insert(InventoryItem).values(
                name="Item consumo inválido",
                category_id=category_id,
                item_kind=ItemKind.FOOD,
                unit=Unit.KG,
                daily_consumption=Decimal("-0.001"),
                consumption_basis=ConsumptionBasis.HOUSEHOLD,
            ),
        )

    _run_isolated(ensure_test_database_name, operation)


def test_postgres_rejects_invalid_enum_values(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        category_id = await _insert_category(connection, "Categoria enum")
        await _expect_integrity_error(
            connection,
            text(
                "INSERT INTO household_members (id, name, member_type) "
                "VALUES (:id, :name, :member_type)"
            ).bindparams(
                id=uuid.uuid4(),
                name="Membro inválido",
                member_type="ROBOT",
            ),
        )
        for field, invalid_value in (
            ("item_kind", "DRINK"),
            ("unit", "gallon"),
            ("consumption_basis", "PER_ROBOT"),
        ):
            await _expect_integrity_error(
                connection,
                text(
                    "INSERT INTO inventory_items "
                    "(id, name, category_id, item_kind, unit, consumption_basis) "
                    "VALUES (:id, :name, :category_id, :item_kind, :unit, "
                    ":consumption_basis)"
                ).bindparams(
                    id=uuid.uuid4(),
                    name="Item inválido",
                    category_id=category_id,
                    item_kind=invalid_value if field == "item_kind" else "FOOD",
                    unit=invalid_value if field == "unit" else "kg",
                    consumption_basis=(
                        invalid_value if field == "consumption_basis" else "HOUSEHOLD"
                    ),
                ),
            )

    _run_isolated(ensure_test_database_name, operation)


def test_postgres_rejects_batch_with_missing_item(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        await _expect_integrity_error(
            connection,
            insert(StockBatch).values(
                inventory_item_id=uuid.uuid4(),
                quantity=Decimal("1.000"),
            ),
        )

    _run_isolated(ensure_test_database_name, operation)


def test_postgres_rejects_case_insensitive_duplicate_category(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        await _insert_category(connection, "Categoria Duplicada")
        await _expect_integrity_error(
            connection,
            insert(Category).values(name="categoria duplicada"),
        )

    _run_isolated(ensure_test_database_name, operation)


def test_postgres_restricts_category_deletion_with_items(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        category_id = await _insert_category(connection, "Categoria protegida")
        await _insert_item(connection, category_id)
        await _expect_integrity_error(
            connection,
            delete(Category).where(Category.id == category_id),
        )

    _run_isolated(ensure_test_database_name, operation)


def test_trigger_assigns_global_change_seq_on_insert_and_update(
    ensure_test_database_name: str,
) -> None:
    async def operation(connection: AsyncConnection) -> None:
        category_id = uuid.uuid4()
        inserted = await connection.execute(
            insert(Category)
            .values(id=category_id, name="Categoria sequência")
            .returning(Category.change_seq, Category.updated_at)
        )
        inserted_seq, inserted_updated_at = inserted.one()

        updated = await connection.execute(
            update(Category)
            .where(Category.id == category_id)
            .values(name="Categoria sequência alterada")
            .returning(Category.change_seq, Category.updated_at)
        )
        updated_seq, updated_updated_at = updated.one()

        other_category_id = uuid.uuid4()
        other = await connection.execute(
            insert(Category)
            .values(id=other_category_id, name="Outra categoria")
            .returning(Category.change_seq)
        )

        assert inserted_seq > 0
        assert updated_seq > inserted_seq
        assert other.scalar_one() > updated_seq
        assert inserted_updated_at < updated_updated_at

    _run_isolated(ensure_test_database_name, operation)


def test_write_helper_serializes_sequence_with_commit_order(
    ensure_test_database_name: str,
) -> None:
    async def run() -> None:
        engine = create_async_engine(ensure_test_database_name, poolclass=NullPool)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        first_has_lock = asyncio.Event()
        second_started = asyncio.Event()
        release_first = asyncio.Event()

        async def first_write() -> int:
            async with write_transaction(factory) as session:
                category = Category(
                    id=uuid.uuid4(),
                    name=f"Categoria concorrente A {uuid.uuid4()}",
                )
                session.add(category)
                await session.flush()
                first_seq = category.change_seq
                first_has_lock.set()
                await release_first.wait()
                return first_seq

        async def second_write() -> int:
            await first_has_lock.wait()
            second_started.set()
            async with write_transaction(factory) as session:
                category = Category(
                    id=uuid.uuid4(),
                    name=f"Categoria concorrente B {uuid.uuid4()}",
                )
                session.add(category)
                await session.flush()
                return category.change_seq

        first_task = asyncio.create_task(first_write())
        second_task = asyncio.create_task(second_write())
        try:
            await asyncio.wait_for(second_started.wait(), timeout=5)
            await asyncio.sleep(0.1)
            assert not second_task.done()
        finally:
            release_first.set()
        first_seq, second_seq = await asyncio.gather(first_task, second_task)
        await engine.dispose()

        assert second_seq > first_seq

    asyncio.run(run())

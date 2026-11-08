import uuid
from datetime import UTC, datetime
from typing import cast

from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import conflict, not_found
from app.models import Category, HouseholdMember, InventoryItem, StockBatch
from app.schemas import InventoryUpdate

Record = HouseholdMember | Category | InventoryItem | StockBatch
EntityModel = type[HouseholdMember] | type[Category] | type[InventoryItem] | type[StockBatch]
ENTITY_MODELS: dict[str, EntityModel] = {
    "household_members": HouseholdMember,
    "categories": Category,
    "inventory_items": InventoryItem,
    "stock_batches": StockBatch,
}


def now_utc() -> datetime:
    return datetime.now(UTC)


async def list_active[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
) -> list[T]:
    result = await session.scalars(
        select(model)
        .where(model.deleted_at.is_(None))
        .order_by(model.created_at, model.id)
        .limit(1000)
    )
    return list(result)


async def get_active[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
    entity_id: uuid.UUID,
) -> T:
    record = await session.get(model, entity_id)
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    return record


async def list_item_batches(
    session: AsyncSession,
    inventory_item_id: uuid.UUID,
) -> list[StockBatch]:
    records = await session.scalars(
        select(StockBatch)
        .where(
            StockBatch.inventory_item_id == inventory_item_id,
            StockBatch.deleted_at.is_(None),
        )
        .order_by(StockBatch.expiration_date.nulls_last(), StockBatch.id)
        .limit(1000)
    )
    return list(records)


async def update_record[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
    entity_id: uuid.UUID,
    data: BaseModel,
    *,
    client_ts: datetime | None = None,
) -> T:
    record = cast(Record | None, await session.get(model, entity_id))
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    if model is InventoryItem and isinstance(data, InventoryUpdate):
        category_id = data.category_id
        if category_id is not None:
            await get_active(session, Category, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    record.client_updated_at = client_ts or now_utc()
    await session.flush()
    return cast(T, record)


async def soft_delete(
    session: AsyncSession,
    model: type[Category] | type[HouseholdMember] | type[InventoryItem] | type[StockBatch],
    entity_id: uuid.UUID,
    *,
    client_ts: datetime | None = None,
) -> None:
    record = cast(Record | None, await session.get(model, entity_id))
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    timestamp = client_ts or now_utc()
    if model is Category:
        active_item = await session.scalar(
            select(InventoryItem.id)
            .where(
                InventoryItem.category_id == entity_id,
                InventoryItem.deleted_at.is_(None),
            )
            .limit(1)
        )
        if active_item is not None:
            raise conflict("Não é possível excluir uma categoria que possui itens ativos.")
    if model is InventoryItem:
        await session.execute(
            update(StockBatch)
            .where(StockBatch.inventory_item_id == entity_id)
            .values(deleted_at=timestamp, client_updated_at=timestamp)
        )
    record.deleted_at = timestamp
    record.client_updated_at = timestamp
    await session.flush()

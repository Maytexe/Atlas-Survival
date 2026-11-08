import uuid
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, InventoryItem, StockBatch
from app.schemas import InventoryCreate, InventoryUpdate
from app.services.records import get_active, now_utc, soft_delete, update_record


async def create_inventory_item(
    session: AsyncSession,
    data: InventoryCreate,
    client_ts: datetime | None = None,
) -> InventoryItem:
    await get_active(session, Category, data.category_id)
    item = InventoryItem(
        id=data.id or uuid.uuid4(),
        name=data.name,
        description=data.description,
        category_id=data.category_id,
        item_kind=data.item_kind,
        unit=data.unit,
        daily_consumption=data.daily_consumption,
        consumption_basis=data.consumption_basis,
        client_updated_at=client_ts or data.client_updated_at or now_utc(),
    )
    session.add(item)
    await session.flush()
    return item


async def update_inventory_item(
    session: AsyncSession,
    item_id: uuid.UUID,
    data: InventoryUpdate,
    client_ts: datetime | None = None,
) -> InventoryItem:
    if data.category_id is not None:
        await get_active(session, Category, data.category_id)
    return await update_record(
        session,
        InventoryItem,
        item_id,
        data,
        client_ts=client_ts,
    )


async def delete_inventory_item(
    session: AsyncSession,
    item_id: uuid.UUID,
    client_ts: datetime | None = None,
) -> None:
    await get_active(session, InventoryItem, item_id)
    timestamp = client_ts or now_utc()
    await session.execute(
        update(StockBatch)
        .where(StockBatch.inventory_item_id == item_id)
        .values(deleted_at=timestamp, client_updated_at=timestamp)
    )
    await soft_delete(session, InventoryItem, item_id, client_ts=timestamp)

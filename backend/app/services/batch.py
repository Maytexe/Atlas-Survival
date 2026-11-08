import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryItem, StockBatch
from app.schemas import BatchUpdate, SyncBatchCreate
from app.services.records import get_active, now_utc, soft_delete, update_record


async def create_batch(
    session: AsyncSession,
    data: SyncBatchCreate,
    client_ts: datetime | None = None,
) -> StockBatch:
    await get_active(session, InventoryItem, data.inventory_item_id)
    batch = StockBatch(
        id=data.id or uuid.uuid4(),
        inventory_item_id=data.inventory_item_id,
        quantity=data.quantity,
        expiration_date=data.expiration_date,
        batch_number=data.batch_number,
        storage_location=data.storage_location,
        client_updated_at=client_ts or data.client_updated_at or now_utc(),
    )
    session.add(batch)
    await session.flush()
    return batch


async def update_batch(
    session: AsyncSession,
    batch_id: uuid.UUID,
    data: BatchUpdate,
    client_ts: datetime | None = None,
) -> StockBatch:
    return await update_record(session, StockBatch, batch_id, data, client_ts=client_ts)


async def delete_batch(
    session: AsyncSession,
    batch_id: uuid.UUID,
    client_ts: datetime | None = None,
) -> None:
    await soft_delete(session, StockBatch, batch_id, client_ts=client_ts)

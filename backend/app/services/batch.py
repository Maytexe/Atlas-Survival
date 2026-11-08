import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryItem, StockBatch
from app.schemas import BatchCreate
from app.services.records import get_active, now_utc


async def create_batch(
    session: AsyncSession,
    inventory_item_id: uuid.UUID,
    data: BatchCreate,
) -> StockBatch:
    await get_active(session, InventoryItem, inventory_item_id)
    batch = StockBatch(
        id=data.id or uuid.uuid4(),
        inventory_item_id=inventory_item_id,
        quantity=data.quantity,
        expiration_date=data.expiration_date,
        batch_number=data.batch_number,
        storage_location=data.storage_location,
        client_updated_at=data.client_updated_at or now_utc(),
    )
    session.add(batch)
    await session.flush()
    return batch

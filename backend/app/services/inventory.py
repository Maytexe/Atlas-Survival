import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, InventoryItem
from app.schemas import InventoryCreate
from app.services.records import get_active, now_utc


async def create_inventory_item(
    session: AsyncSession,
    data: InventoryCreate,
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
        client_updated_at=data.client_updated_at or now_utc(),
    )
    session.add(item)
    await session.flush()
    return item

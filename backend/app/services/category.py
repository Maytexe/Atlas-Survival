import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import conflict
from app.models import Category, InventoryItem
from app.schemas import CategoryCreate, CategoryUpdate
from app.services.records import get_active, now_utc, soft_delete, update_record


async def create_category(
    session: AsyncSession,
    data: CategoryCreate,
    client_ts: datetime | None = None,
) -> Category:
    category = Category(
        id=data.id or uuid.uuid4(),
        name=data.name,
        description=data.description,
        client_updated_at=client_ts or data.client_updated_at or now_utc(),
    )
    session.add(category)
    await session.flush()
    return category


async def update_category(
    session: AsyncSession,
    category_id: uuid.UUID,
    data: CategoryUpdate,
    client_ts: datetime | None = None,
) -> Category:
    return await update_record(session, Category, category_id, data, client_ts=client_ts)


async def delete_category(
    session: AsyncSession,
    category_id: uuid.UUID,
    client_ts: datetime | None = None,
) -> None:
    await get_active(session, Category, category_id)
    active_item = await session.scalar(
        select(InventoryItem.id)
        .where(
            InventoryItem.category_id == category_id,
            InventoryItem.deleted_at.is_(None),
        )
        .limit(1)
    )
    if active_item is not None:
        raise conflict("Não é possível excluir uma categoria que possui itens ativos.")
    await soft_delete(session, Category, category_id, client_ts=client_ts)

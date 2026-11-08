import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category
from app.schemas import CategoryCreate
from app.services.records import now_utc


async def create_category(session: AsyncSession, data: CategoryCreate) -> Category:
    category = Category(
        id=data.id or uuid.uuid4(),
        name=data.name,
        description=data.description,
        client_updated_at=data.client_updated_at or now_utc(),
    )
    session.add(category)
    await session.flush()
    return category

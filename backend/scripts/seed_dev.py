import asyncio
import uuid

from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.db.engine import engine
from app.models import (
    Category,
    HouseholdMember,
    InventoryItem,
    StockBatch,
)

CATEGORY_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")
MEMBER_ID = uuid.UUID("22222222-2222-4222-8222-222222222222")
ITEM_ID = uuid.UUID("33333333-3333-4333-8333-333333333333")
BATCH_ID = uuid.UUID("44444444-4444-4444-8444-444444444444")


async def seed() -> None:
    if settings.environment != "development":
        raise RuntimeError("seed_dev.py só pode ser executado em development.")

    async with engine.begin() as connection:
        await connection.execute(
            insert(Category)
            .values(id=CATEGORY_ID, name="DEMO - Categoria Ficticia")
            .on_conflict_do_nothing(index_elements=[Category.id])
        )
        await connection.execute(
            insert(HouseholdMember)
            .values(
                id=MEMBER_ID,
                name="DEMO - Pessoa Ficticia",
                member_type="PERSON",
                age=30,
                notes="Registro ficticio para desenvolvimento.",
            )
            .on_conflict_do_nothing(index_elements=[HouseholdMember.id])
        )
        await connection.execute(
            insert(InventoryItem)
            .values(
                id=ITEM_ID,
                name="DEMO - Agua Ficticia",
                category_id=CATEGORY_ID,
                item_kind="WATER",
                unit="L",
                consumption_basis="HOUSEHOLD",
                description="Item ficticio para desenvolvimento.",
            )
            .on_conflict_do_nothing(index_elements=[InventoryItem.id])
        )
        await connection.execute(
            insert(StockBatch)
            .values(
                id=BATCH_ID,
                inventory_item_id=ITEM_ID,
                quantity="1.000",
                batch_number="DEMO-LOTE-001",
                storage_location="DEMO - Prateleira",
            )
            .on_conflict_do_nothing(index_elements=[StockBatch.id])
        )


if __name__ == "__main__":
    asyncio.run(seed())

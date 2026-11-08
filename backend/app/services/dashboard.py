import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import BatchSnapshot, ItemSnapshot, calculate_dashboard
from app.models import HouseholdMember, InventoryItem, StockBatch
from app.schemas import DashboardData


async def load_domain_items(session: AsyncSession) -> tuple[ItemSnapshot, ...]:
    member_types = list(
        await session.scalars(
            select(HouseholdMember.member_type).where(HouseholdMember.deleted_at.is_(None))
        )
    )
    person_count = sum(member.value == "PERSON" for member in member_types)
    animal_count = sum(member.value == "ANIMAL" for member in member_types)
    items = list(
        await session.scalars(
            select(InventoryItem)
            .where(InventoryItem.deleted_at.is_(None))
            .order_by(InventoryItem.name, InventoryItem.id)
            .limit(1000)
        )
    )
    batches = list(
        await session.scalars(
            select(StockBatch)
            .where(StockBatch.deleted_at.is_(None))
            .order_by(StockBatch.expiration_date, StockBatch.id)
        )
    )
    batches_by_item: dict[uuid.UUID, list[BatchSnapshot]] = {}
    for batch in batches:
        batches_by_item.setdefault(batch.inventory_item_id, []).append(
            BatchSnapshot(
                id=str(batch.id),
                quantity=batch.quantity,
                expiration_date=batch.expiration_date,
            )
        )
    return tuple(
        ItemSnapshot(
            id=str(item.id),
            name=item.name,
            item_kind=item.item_kind,
            unit=item.unit,
            daily_consumption=item.daily_consumption,
            consumption_basis=item.consumption_basis,
            person_count=person_count,
            animal_count=animal_count,
            batches=tuple(batches_by_item.get(item.id, [])),
        )
        for item in items
    )


async def build_dashboard(session: AsyncSession, today: date) -> DashboardData:
    items = await load_domain_items(session)
    members = list(
        await session.scalars(select(HouseholdMember).where(HouseholdMember.deleted_at.is_(None)))
    )
    calculation = calculate_dashboard(items=items, today=today)
    return {
        "total_items": len(items),
        "total_members": len(members),
        "people": sum(member.member_type.value == "PERSON" for member in members),
        "animals": sum(member.member_type.value == "ANIMAL" for member in members),
        "availability": {
            key: {name: format(value, "f") for name, value in values.items()}
            for key, values in calculation["availability"].items()
        },
        "expired_batches": calculation["expired_batches"],
        "expiring_soon_batches": calculation["expiring_soon_batches"],
        "autonomy": calculation["autonomy"],
        "today": today.isoformat(),
    }

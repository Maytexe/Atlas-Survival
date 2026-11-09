import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import BatchSnapshot, ItemSnapshot, calculate_dashboard
from app.models import HouseholdMember, InventoryItem, StockBatch
from app.schemas import DashboardData, GoalData


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


async def build_dashboard(
    session: AsyncSession,
    today: date,
    goal_food_days: int | None = None,
    goal_water_days: int | None = None,
) -> DashboardData:
    items = await load_domain_items(session)
    members = list(
        await session.scalars(select(HouseholdMember).where(HouseholdMember.deleted_at.is_(None)))
    )
    calculation = calculate_dashboard(
        items=items,
        today=today,
        goal_food_days=goal_food_days,
        goal_water_days=goal_water_days,
    )
    result: DashboardData = {
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
        "autonomy": [
            {
                **aggregate,
                "available_base": format(aggregate["available_base"], "f"),
                "daily_base": format(aggregate["daily_base"], "f"),
            }
            for aggregate in calculation["autonomy"]
        ],
        "today": today.isoformat(),
    }
    if goal_food_days is not None or goal_water_days is not None:
        result["goals"] = [
            GoalData(
                item_kind=goal["item_kind"],
                dimension=goal["dimension"],
                base_unit=goal["base_unit"],
                goal_days=goal["goal_days"],
                status=goal["status"],
                available_base=format(goal["available_base"], "f"),
                daily_base=format(goal["daily_base"], "f"),
                needed_base=format(goal["needed_base"], "f"),
                missing_base=format(goal["missing_base"], "f"),
                partial_coverage=goal["partial_coverage"],
                coverage_count=goal["coverage_count"],
                total_items=goal["total_items"],
            )
            for goal in calculation["goals"]
        ]
    return result

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import (
    aggregate_autonomy,
    calculate_expiry,
    calculate_stock_availability,
    calculate_unit_base,
)
from app.models import HouseholdMember, InventoryItem, StockBatch


async def _load_domain_items(session: AsyncSession) -> list[dict[str, Any]]:
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
    batches_by_item: dict[uuid.UUID, list[dict[str, object]]] = {}
    for batch in batches:
        batches_by_item.setdefault(batch.inventory_item_id, []).append(
            {
                "id": str(batch.id),
                "quantity": batch.quantity,
                "expiration_date": batch.expiration_date,
            }
        )
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "item_kind": item.item_kind.value,
            "unit": item.unit.value,
            "daily_consumption": item.daily_consumption,
            "consumption_basis": item.consumption_basis.value,
            "person_count": person_count,
            "animal_count": animal_count,
            "batches": batches_by_item.get(item.id, []),
        }
        for item in items
    ]


async def build_dashboard(session: AsyncSession, today: date) -> dict[str, Any]:
    items = await _load_domain_items(session)
    members = list(
        await session.scalars(select(HouseholdMember).where(HouseholdMember.deleted_at.is_(None)))
    )
    availability: dict[str, dict[str, Decimal]] = {}
    expired_batch_count = 0
    expiring_batch_count = 0
    for item in items:
        item_availability = calculate_stock_availability(batches=item["batches"], today=today)
        unit = item["unit"]
        dimension = calculate_unit_base(unit=unit, quantity=Decimal("1"))["dimension"]
        if item["item_kind"] in {"FOOD", "WATER"}:
            base_unit = calculate_unit_base(unit=unit, quantity=Decimal("1"))["base_unit"]
            suffix = f":{base_unit}" if dimension == "COUNT" else ""
            key = f"{item['item_kind']}:{dimension}{suffix}"
            available_base = calculate_unit_base(
                unit=unit,
                quantity=item_availability["available"],
            )["base_quantity"]
            availability.setdefault(key, {}).setdefault("available", Decimal("0"))
            availability[key]["available"] += available_base
        for batch in item["batches"]:
            expiry = calculate_expiry(expiration_date=batch["expiration_date"], today=today)
            expired_batch_count += int(expiry["expired"])
            expiring_batch_count += int(expiry["expiring_soon"])
    return {
        "total_items": len(items),
        "total_members": len(members),
        "people": sum(member.member_type.value == "PERSON" for member in members),
        "animals": sum(member.member_type.value == "ANIMAL" for member in members),
        "availability": {
            key: {name: format(value, "f") for name, value in values.items()}
            for key, values in sorted(availability.items())
        },
        "expired_batches": expired_batch_count,
        "expiring_soon_batches": expiring_batch_count,
        "autonomy": aggregate_autonomy(items=items, today=today),
        "sync_status": "Online",
        "today": today.isoformat(),
    }

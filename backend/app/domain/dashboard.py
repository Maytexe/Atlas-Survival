from datetime import date
from decimal import Decimal
from typing import TypedDict

from app.domain.autonomy import aggregate_autonomy
from app.domain.availability import calculate_stock_availability
from app.domain.enums import ItemKind
from app.domain.expiry import calculate_expiry
from app.domain.goals import GoalResult, evaluate_goals
from app.domain.types import ItemSnapshot
from app.domain.units import UNIT_FACTORS, calculate_unit_base


class DashboardResult(TypedDict):
    availability: dict[str, dict[str, Decimal]]
    expired_batches: int
    expiring_soon_batches: int
    autonomy: list[dict[str, object]]
    goals: list[GoalResult]


def calculate_dashboard(
    *,
    items: tuple[ItemSnapshot, ...],
    today: date,
    goal_food_days: int | None = None,
    goal_water_days: int | None = None,
) -> DashboardResult:
    availability: dict[str, dict[str, Decimal]] = {}
    expired_batch_count = 0
    expiring_batch_count = 0
    for item in items:
        item_availability = calculate_stock_availability(batches=item.batches, today=today)
        dimension, base_unit, _factor = UNIT_FACTORS[item.unit]
        if item.item_kind in {ItemKind.FOOD, ItemKind.WATER}:
            suffix = f":{base_unit}" if dimension == "COUNT" else ""
            key = f"{item.item_kind.value}:{dimension}{suffix}"
            available_base = calculate_unit_base(
                unit=item.unit,
                quantity=item_availability["available"],
            )["base_quantity"]
            availability.setdefault(key, {}).setdefault("available", Decimal("0"))
            availability[key]["available"] += available_base
        for batch in item.batches:
            expiry = calculate_expiry(expiration_date=batch.expiration_date, today=today)
            expired_batch_count += int(expiry["expired"])
            expiring_batch_count += int(expiry["expiring_soon"])
    return {
        "availability": {key: values for key, values in sorted(availability.items())},
        "expired_batches": expired_batch_count,
        "expiring_soon_batches": expiring_batch_count,
        "autonomy": aggregate_autonomy(items=items, today=today),
        "goals": evaluate_goals(
            items=items,
            today=today,
            goal_food_days=goal_food_days,
            goal_water_days=goal_water_days,
        ),
    }

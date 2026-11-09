from collections import defaultdict
from datetime import date
from decimal import ROUND_CEILING, Decimal
from typing import Literal, TypedDict, cast

from app.domain.availability import calculate_stock_availability
from app.domain.consumption import effective_daily, effective_daily_in_base
from app.domain.enums import ItemKind
from app.domain.types import ItemSnapshot
from app.domain.units import UNIT_FACTORS, calculate_unit_base

GoalStatus = Literal["NO_GOAL", "NO_DATA", "MET", "BELOW"]
_ZERO = Decimal("0")


class GoalResult(TypedDict):
    item_kind: Literal["FOOD", "WATER"]
    dimension: Literal["MASS", "VOLUME", "COUNT"]
    base_unit: str
    goal_days: int | None
    status: GoalStatus
    available_base: Decimal
    daily_base: Decimal
    needed_base: Decimal
    missing_base: Decimal
    partial_coverage: bool
    coverage_count: int
    total_items: int
    limiting_item: str | None


def evaluate_goals(
    *,
    items: tuple[ItemSnapshot, ...],
    today: date,
    goal_food_days: int | None,
    goal_water_days: int | None,
) -> list[GoalResult]:
    if goal_food_days is None and goal_water_days is None:
        return []

    goals_by_kind = {
        ItemKind.FOOD: goal_food_days,
        ItemKind.WATER: goal_water_days,
    }
    groups: dict[tuple[ItemKind, str, str], list[ItemSnapshot]] = defaultdict(list)
    for item in items:
        if item.item_kind not in goals_by_kind:
            continue
        dimension, base_unit, _factor = UNIT_FACTORS[item.unit]
        groups[(item.item_kind, dimension, base_unit)].append(item)

    results: list[GoalResult] = []
    for (item_kind, dimension, base_unit), group_items in groups.items():
        goal_days = goals_by_kind[item_kind]
        consuming_items = [item for item in group_items if effective_daily(item) > _ZERO]
        available_base = _ZERO
        daily_base = _ZERO
        item_autonomies: list[tuple[Decimal, str]] = []
        for item in consuming_items:
            available = calculate_stock_availability(
                batches=item.batches,
                today=today,
            )["available"]
            available_base += calculate_unit_base(
                unit=item.unit,
                quantity=available,
            )["base_quantity"]
            item_daily = effective_daily(item)
            daily_base += effective_daily_in_base(item)
            item_autonomies.append((available / item_daily, item.id))

        needed_base = Decimal(goal_days) * daily_base if goal_days is not None else _ZERO
        deficit = max(_ZERO, needed_base - available_base)
        missing_base = deficit.to_integral_value(rounding=ROUND_CEILING)
        if goal_days is None:
            status: GoalStatus = "NO_GOAL"
        elif not consuming_items:
            status = "NO_DATA"
        elif available_base >= needed_base:
            status = "MET"
        else:
            status = "BELOW"

        results.append(
            {
                "item_kind": cast(Literal["FOOD", "WATER"], item_kind.value),
                "dimension": cast(Literal["MASS", "VOLUME", "COUNT"], dimension),
                "base_unit": base_unit,
                "goal_days": goal_days,
                "status": status,
                "available_base": available_base,
                "daily_base": daily_base,
                "needed_base": needed_base,
                "missing_base": missing_base,
                "partial_coverage": len(consuming_items) < len(group_items),
                "coverage_count": len(consuming_items),
                "total_items": len(group_items),
                "limiting_item": (
                    min(item_autonomies, key=lambda value: (value[0], value[1]))[1]
                    if item_autonomies
                    else None
                ),
            }
        )

    dimension_order = {"MASS": 0, "VOLUME": 1, "COUNT": 2}
    kind_order = {ItemKind.FOOD.value: 0, ItemKind.WATER.value: 1}
    results.sort(
        key=lambda goal: (
            kind_order[goal["item_kind"]],
            dimension_order[goal["dimension"]],
            goal["base_unit"],
        )
    )
    return results

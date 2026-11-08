from collections import defaultdict
from datetime import date
from decimal import ROUND_FLOOR, Decimal

from app.domain.availability import calculate_stock_availability
from app.domain.consumption import effective_daily, effective_daily_in_base, item_batches
from app.domain.units import _UNIT_FACTORS, calculate_unit_base

_ZERO = Decimal("0")


def calculate_autonomy(item: dict[str, object], today: date) -> int | None:
    daily = effective_daily(item)
    if daily <= _ZERO:
        return None
    availability = calculate_stock_availability(
        batches=item_batches(item),
        today=today,
    )
    return int((availability["available"] / daily).to_integral_value(rounding=ROUND_FLOOR))


def aggregate_autonomy(
    *,
    items: list[dict[str, object]],
    today: date,
) -> list[dict[str, object]]:
    groups: dict[tuple[str, str, str], list[dict[str, object]]] = defaultdict(list)
    for item in items:
        item_kind = str(item["item_kind"])
        if item_kind not in {"FOOD", "WATER"}:
            continue
        dimension, base_unit, _ = _UNIT_FACTORS[str(item["unit"])]
        group_unit = base_unit if dimension == "COUNT" else ""
        groups[(item_kind, dimension, group_unit)].append(item)

    aggregates: list[dict[str, object]] = []
    for (item_kind, dimension, base_unit), group_items in groups.items():
        consuming_items = [item for item in group_items if effective_daily(item) > _ZERO]
        if not consuming_items:
            continue
        available_base = _ZERO
        effective_daily_base = _ZERO
        item_autonomies: list[tuple[Decimal, str]] = []
        for item in consuming_items:
            availability = calculate_stock_availability(
                batches=item_batches(item),
                today=today,
            )
            available_base += calculate_unit_base(
                unit=str(item["unit"]),
                quantity=availability["available"],
            )["base_quantity"]
            effective_daily_base += effective_daily_in_base(item)
            item_autonomies.append(
                (
                    availability["available"] / effective_daily(item),
                    str(item["id"]),
                )
            )
        aggregate_days = int(
            (available_base / effective_daily_base).to_integral_value(rounding=ROUND_FLOOR)
        )
        limiting_item = min(item_autonomies, key=lambda value: (value[0], value[1]))[1]
        aggregate: dict[str, object] = {
            "item_kind": item_kind,
            "dimension": dimension,
            "days": aggregate_days,
            "coverage_count": len(consuming_items),
            "total_items": len(group_items),
            "coverage_label": (f"calculado com {len(consuming_items)} de {len(group_items)} itens"),
            "limiting_item": limiting_item,
        }
        if dimension == "COUNT":
            aggregate["base_unit"] = base_unit
        aggregates.append(aggregate)
    dimension_order = {"MASS": 0, "VOLUME": 1, "COUNT": 2}
    kind_order = {"FOOD": 0, "WATER": 1}
    aggregates.sort(
        key=lambda item: (
            kind_order[str(item["item_kind"])],
            dimension_order[str(item["dimension"])],
            str(item.get("base_unit", "")),
        )
    )
    return aggregates

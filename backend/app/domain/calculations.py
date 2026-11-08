from collections import defaultdict
from datetime import date
from decimal import ROUND_FLOOR, Decimal
from typing import TypedDict

EXPIRY_WARNING_DAYS = 30
_ZERO = Decimal("0")
_ONE = Decimal("1")
_UNIT_FACTORS: dict[str, tuple[str, str, Decimal]] = {
    "kg": ("MASS", "g", Decimal("1000")),
    "g": ("MASS", "g", _ONE),
    "L": ("VOLUME", "ml", Decimal("1000")),
    "ml": ("VOLUME", "ml", _ONE),
    "unidade": ("COUNT", "unidade", _ONE),
    "pacote": ("COUNT", "pacote", _ONE),
    "lata": ("COUNT", "lata", _ONE),
    "garrafa": ("COUNT", "garrafa", _ONE),
}
_SEVERITY_ORDER = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}


class ExpiryResult(TypedDict):
    expired: bool
    days_until_expiration: int | None
    expiring_soon: bool


class UnitBaseResult(TypedDict):
    dimension: str
    base_unit: str
    base_quantity: Decimal


class AvailabilityResult(TypedDict):
    available: Decimal
    expired_quantity: Decimal


class Alert(TypedDict):
    type: str
    severity: str
    item_id: str
    batch_id: str | None
    date: str | None


def _decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return _ZERO
    return Decimal(str(value))


def _as_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def calculate_expiry(*, expiration_date: date | None, today: date) -> ExpiryResult:
    days_until_expiration = (expiration_date - today).days if expiration_date is not None else None
    return {
        "expired": days_until_expiration is not None and days_until_expiration < 0,
        "days_until_expiration": days_until_expiration,
        "expiring_soon": days_until_expiration is not None
        and 0 <= days_until_expiration <= EXPIRY_WARNING_DAYS,
    }


def calculate_unit_base(*, unit: str, quantity: Decimal) -> UnitBaseResult:
    try:
        dimension, base_unit, factor = _UNIT_FACTORS[unit]
    except KeyError as error:
        raise ValueError(f"Unidade inválida: {unit}") from error
    return {
        "dimension": dimension,
        "base_unit": base_unit,
        "base_quantity": quantity * factor,
    }


def calculate_stock_availability(
    *,
    batches: list[dict[str, object]],
    today: date,
) -> AvailabilityResult:
    available = _ZERO
    expired_quantity = _ZERO
    for batch in batches:
        quantity = _decimal(batch.get("quantity"))
        expiry = calculate_expiry(
            expiration_date=_as_date(batch.get("expiration_date")),
            today=today,
        )
        if expiry["expired"]:
            expired_quantity += quantity
        else:
            available += quantity
    return {"available": available, "expired_quantity": expired_quantity}


def _effective_daily(item: dict[str, object]) -> Decimal:
    daily_consumption = item.get("daily_consumption")
    if daily_consumption is None:
        return _ZERO
    basis = str(item.get("consumption_basis", "HOUSEHOLD"))
    if basis == "HOUSEHOLD":
        multiplier = _ONE
    elif basis == "PER_PERSON":
        multiplier = _decimal(item.get("person_count"))
    elif basis == "PER_ANIMAL":
        multiplier = _decimal(item.get("animal_count"))
    else:
        raise ValueError(f"Base de consumo inválida: {basis}")
    return _decimal(daily_consumption) * multiplier


def calculate_autonomy(item: dict[str, object], today: date) -> int | None:
    effective_daily = _effective_daily(item)
    if effective_daily <= _ZERO:
        return None
    availability = calculate_stock_availability(
        batches=_item_batches(item),
        today=today,
    )
    return int(
        (availability["available"] / effective_daily).to_integral_value(rounding=ROUND_FLOOR)
    )


def _item_batches(item: dict[str, object]) -> list[dict[str, object]]:
    batches = item.get("batches", [])
    if not isinstance(batches, list):
        raise ValueError("A lista de lotes do item é inválida.")
    return [batch for batch in batches if isinstance(batch, dict)]


def _effective_daily_in_base(item: dict[str, object]) -> Decimal:
    effective_daily = _effective_daily(item)
    if effective_daily == _ZERO:
        return _ZERO
    return calculate_unit_base(
        unit=str(item["unit"]),
        quantity=effective_daily,
    )["base_quantity"]


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
        consuming_items = [item for item in group_items if _effective_daily(item) > _ZERO]
        if not consuming_items:
            continue
        available_base = _ZERO
        effective_daily_base = _ZERO
        item_autonomies: list[tuple[Decimal, str]] = []
        for item in consuming_items:
            availability = calculate_stock_availability(
                batches=_item_batches(item),
                today=today,
            )
            available_base += calculate_unit_base(
                unit=str(item["unit"]),
                quantity=availability["available"],
            )["base_quantity"]
            effective_daily_base += _effective_daily_in_base(item)
            item_autonomies.append(
                (
                    availability["available"] / _effective_daily(item),
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


def calculate_alerts(
    *,
    items: list[dict[str, object]],
    today: date,
    low_stock_days: int,
) -> list[Alert]:
    alerts: list[Alert] = []
    for item in items:
        item_id = str(item["id"])
        batches = _item_batches(item)
        availability = calculate_stock_availability(batches=batches, today=today)
        for batch in batches:
            expiration_date = _as_date(batch.get("expiration_date"))
            expiry = calculate_expiry(expiration_date=expiration_date, today=today)
            if expiry["expired"]:
                alerts.append(
                    {
                        "type": "EXPIRED",
                        "severity": "CRITICAL",
                        "item_id": item_id,
                        "batch_id": str(batch["id"]),
                        "date": expiration_date.isoformat() if expiration_date else None,
                    }
                )
            elif expiry["expiring_soon"]:
                alerts.append(
                    {
                        "type": "EXPIRING_SOON",
                        "severity": "WARNING",
                        "item_id": item_id,
                        "batch_id": str(batch["id"]),
                        "date": expiration_date.isoformat() if expiration_date else None,
                    }
                )
        if availability["available"] == _ZERO:
            alerts.append(
                {
                    "type": "OUT_OF_STOCK",
                    "severity": "CRITICAL",
                    "item_id": item_id,
                    "batch_id": None,
                    "date": None,
                }
            )
        effective_daily = _effective_daily(item)
        if effective_daily == _ZERO:
            alerts.append(
                {
                    "type": "NO_CONSUMPTION_DATA",
                    "severity": "INFO",
                    "item_id": item_id,
                    "batch_id": None,
                    "date": None,
                }
            )
        elif (
            autonomy := calculate_autonomy(item, today)
        ) is not None and autonomy < low_stock_days:
            alerts.append(
                {
                    "type": "LOW_STOCK",
                    "severity": "WARNING",
                    "item_id": item_id,
                    "batch_id": None,
                    "date": None,
                }
            )
    alerts.sort(
        key=lambda alert: (
            _SEVERITY_ORDER[alert["severity"]],
            alert["date"] or "9999-12-31",
            alert["item_id"],
            alert["batch_id"] or "",
            alert["type"],
        )
    )
    return alerts

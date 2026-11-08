from decimal import Decimal

from app.domain.availability import decimal_value
from app.domain.units import calculate_unit_base

_ZERO = Decimal("0")
_ONE = Decimal("1")


def item_batches(item: dict[str, object]) -> list[dict[str, object]]:
    batches = item.get("batches", [])
    if not isinstance(batches, list):
        raise ValueError("A lista de lotes do item é inválida.")
    return [batch for batch in batches if isinstance(batch, dict)]


def effective_daily(item: dict[str, object]) -> Decimal:
    daily_consumption = item.get("daily_consumption")
    if daily_consumption is None:
        return _ZERO
    basis = str(item.get("consumption_basis", "HOUSEHOLD"))
    if basis == "HOUSEHOLD":
        multiplier = _ONE
    elif basis == "PER_PERSON":
        multiplier = decimal_value(item.get("person_count"))
    elif basis == "PER_ANIMAL":
        multiplier = decimal_value(item.get("animal_count"))
    else:
        raise ValueError(f"Base de consumo inválida: {basis}")
    return decimal_value(daily_consumption) * multiplier


def effective_daily_in_base(item: dict[str, object]) -> Decimal:
    daily = effective_daily(item)
    if daily == _ZERO:
        return _ZERO
    return calculate_unit_base(
        unit=str(item["unit"]),
        quantity=daily,
    )["base_quantity"]

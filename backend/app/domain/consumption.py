from decimal import Decimal

from app.domain.enums import ConsumptionBasis
from app.domain.types import ItemSnapshot
from app.domain.units import calculate_unit_base

_ZERO = Decimal("0")
_ONE = Decimal("1")


def effective_daily(item: ItemSnapshot) -> Decimal:
    if item.daily_consumption is None:
        return _ZERO
    if item.consumption_basis is ConsumptionBasis.HOUSEHOLD:
        multiplier = _ONE
    elif item.consumption_basis is ConsumptionBasis.PER_PERSON:
        multiplier = Decimal(item.person_count)
    elif item.consumption_basis is ConsumptionBasis.PER_ANIMAL:
        multiplier = Decimal(item.animal_count)
    else:
        raise ValueError(f"Base de consumo inválida: {item.consumption_basis}")
    return item.daily_consumption * multiplier


def effective_daily_in_base(item: ItemSnapshot) -> Decimal:
    daily = effective_daily(item)
    if daily == _ZERO:
        return _ZERO
    return calculate_unit_base(
        unit=item.unit,
        quantity=daily,
    )["base_quantity"]

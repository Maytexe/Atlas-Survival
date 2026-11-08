from decimal import Decimal
from typing import TypedDict

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


class UnitBaseResult(TypedDict):
    dimension: str
    base_unit: str
    base_quantity: Decimal


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

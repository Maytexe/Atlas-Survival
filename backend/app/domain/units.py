from decimal import Decimal
from typing import TypedDict

from app.domain.enums import Unit

_ONE = Decimal("1")
UNIT_FACTORS: dict[Unit, tuple[str, str, Decimal]] = {
    Unit.KG: ("MASS", "g", Decimal("1000")),
    Unit.G: ("MASS", "g", _ONE),
    Unit.L: ("VOLUME", "ml", Decimal("1000")),
    Unit.ML: ("VOLUME", "ml", _ONE),
    Unit.UNIDADE: ("COUNT", "unidade", _ONE),
    Unit.PACOTE: ("COUNT", "pacote", _ONE),
    Unit.LATA: ("COUNT", "lata", _ONE),
    Unit.GARRAFA: ("COUNT", "garrafa", _ONE),
}


class UnitBaseResult(TypedDict):
    dimension: str
    base_unit: str
    base_quantity: Decimal


def calculate_unit_base(*, unit: Unit, quantity: Decimal) -> UnitBaseResult:
    try:
        dimension, base_unit, factor = UNIT_FACTORS[unit]
    except KeyError as error:
        raise ValueError(f"Unidade inválida: {unit}") from error
    return {
        "dimension": dimension,
        "base_unit": base_unit,
        "base_quantity": quantity * factor,
    }

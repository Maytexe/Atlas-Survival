from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from app.domain.enums import ConsumptionBasis, ItemKind, Unit


@dataclass(frozen=True, slots=True)
class BatchSnapshot:
    id: str
    quantity: Decimal
    expiration_date: date | None


@dataclass(frozen=True, slots=True)
class ItemSnapshot:
    id: str
    name: str
    item_kind: ItemKind
    unit: Unit
    daily_consumption: Decimal | None
    consumption_basis: ConsumptionBasis
    person_count: int
    animal_count: int
    batches: tuple[BatchSnapshot, ...]

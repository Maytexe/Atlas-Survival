from datetime import date
from decimal import Decimal
from typing import Any

from app.domain.enums import ConsumptionBasis, ItemKind, Unit
from app.domain.types import BatchSnapshot, ItemSnapshot


def batch_from_fixture(batch: dict[str, Any]) -> BatchSnapshot:
    expiration_date = batch["expiration_date"]
    return BatchSnapshot(
        id=str(batch["id"]),
        quantity=Decimal(batch["quantity"]),
        expiration_date=date.fromisoformat(expiration_date) if expiration_date else None,
    )


def from_fixture(item: dict[str, Any]) -> ItemSnapshot:
    daily_consumption = item["daily_consumption"]
    return ItemSnapshot(
        id=str(item["id"]),
        name=str(item["name"]),
        item_kind=ItemKind(item["item_kind"]),
        unit=Unit(item["unit"]),
        daily_consumption=Decimal(daily_consumption) if daily_consumption is not None else None,
        consumption_basis=ConsumptionBasis(item["consumption_basis"]),
        person_count=int(item["person_count"]),
        animal_count=int(item["animal_count"]),
        batches=tuple(batch_from_fixture(batch) for batch in item["batches"]),
    )

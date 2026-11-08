from datetime import date
from decimal import Decimal
from typing import TypedDict

from app.domain.expiry import calculate_expiry
from app.domain.types import BatchSnapshot

_ZERO = Decimal("0")


class AvailabilityResult(TypedDict):
    available: Decimal
    expired_quantity: Decimal


def calculate_stock_availability(
    *,
    batches: tuple[BatchSnapshot, ...],
    today: date,
) -> AvailabilityResult:
    available = _ZERO
    expired_quantity = _ZERO
    for batch in batches:
        expiry = calculate_expiry(
            expiration_date=batch.expiration_date,
            today=today,
        )
        if expiry["expired"]:
            expired_quantity += batch.quantity
        else:
            available += batch.quantity
    return {"available": available, "expired_quantity": expired_quantity}

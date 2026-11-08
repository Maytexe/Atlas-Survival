from datetime import date
from decimal import Decimal
from typing import TypedDict

from app.domain.expiry import calculate_expiry

_ZERO = Decimal("0")


class AvailabilityResult(TypedDict):
    available: Decimal
    expired_quantity: Decimal


def decimal_value(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return _ZERO
    return Decimal(str(value))


def as_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def calculate_stock_availability(
    *,
    batches: list[dict[str, object]],
    today: date,
) -> AvailabilityResult:
    available = _ZERO
    expired_quantity = _ZERO
    for batch in batches:
        quantity = decimal_value(batch.get("quantity"))
        expiry = calculate_expiry(
            expiration_date=as_date(batch.get("expiration_date")),
            today=today,
        )
        if expiry["expired"]:
            expired_quantity += quantity
        else:
            available += quantity
    return {"available": available, "expired_quantity": expired_quantity}

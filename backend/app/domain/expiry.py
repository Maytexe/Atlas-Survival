from datetime import date
from typing import TypedDict

EXPIRY_WARNING_DAYS = 30


class ExpiryResult(TypedDict):
    expired: bool
    days_until_expiration: int | None
    expiring_soon: bool


def calculate_expiry(*, expiration_date: date | None, today: date) -> ExpiryResult:
    days_until_expiration = (expiration_date - today).days if expiration_date is not None else None
    return {
        "expired": days_until_expiration is not None and days_until_expiration < 0,
        "days_until_expiration": days_until_expiration,
        "expiring_soon": days_until_expiration is not None
        and 0 <= days_until_expiration <= EXPIRY_WARNING_DAYS,
    }

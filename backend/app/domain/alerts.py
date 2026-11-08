from datetime import date
from decimal import Decimal
from typing import TypedDict

from app.domain.autonomy import calculate_autonomy
from app.domain.availability import calculate_stock_availability
from app.domain.consumption import effective_daily
from app.domain.expiry import calculate_expiry
from app.domain.types import ItemSnapshot

_ZERO = Decimal("0")
_SEVERITY_ORDER = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}


class Alert(TypedDict):
    type: str
    severity: str
    item_id: str
    batch_id: str | None
    date: str | None


def calculate_alerts(
    *,
    items: tuple[ItemSnapshot, ...],
    today: date,
    low_stock_days: int,
) -> list[Alert]:
    alerts: list[Alert] = []
    for item in items:
        availability = calculate_stock_availability(batches=item.batches, today=today)
        for batch in item.batches:
            expiry = calculate_expiry(expiration_date=batch.expiration_date, today=today)
            if expiry["expired"]:
                alerts.append(
                    {
                        "type": "EXPIRED",
                        "severity": "CRITICAL",
                        "item_id": item.id,
                        "batch_id": batch.id,
                        "date": batch.expiration_date.isoformat()
                        if batch.expiration_date
                        else None,
                    }
                )
            elif expiry["expiring_soon"]:
                alerts.append(
                    {
                        "type": "EXPIRING_SOON",
                        "severity": "WARNING",
                        "item_id": item.id,
                        "batch_id": batch.id,
                        "date": batch.expiration_date.isoformat()
                        if batch.expiration_date
                        else None,
                    }
                )
        if availability["available"] == _ZERO:
            alerts.append(
                {
                    "type": "OUT_OF_STOCK",
                    "severity": "CRITICAL",
                    "item_id": item.id,
                    "batch_id": None,
                    "date": None,
                }
            )
        daily = effective_daily(item)
        if daily == _ZERO:
            alerts.append(
                {
                    "type": "NO_CONSUMPTION_DATA",
                    "severity": "INFO",
                    "item_id": item.id,
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
                    "item_id": item.id,
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

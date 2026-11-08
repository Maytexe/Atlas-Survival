from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import calculate_alerts
from app.services.dashboard import _load_domain_items


async def build_alerts(
    session: AsyncSession,
    today: date,
    low_stock_days: int,
) -> list[dict[str, Any]]:
    items = await _load_domain_items(session)
    item_names = {item["id"]: item["name"] for item in items}
    alerts = calculate_alerts(
        items=items,
        today=today,
        low_stock_days=low_stock_days,
    )
    return [
        {
            **alert,
            "item_name": item_names[alert["item_id"]],
            "message": _alert_message(alert["type"]),
        }
        for alert in alerts
    ]


def _alert_message(alert_type: str) -> str:
    return {
        "EXPIRED": "Lote vencido.",
        "OUT_OF_STOCK": "Item sem estoque disponível.",
        "EXPIRING_SOON": "Lote vence em até 30 dias.",
        "LOW_STOCK": "Autonomia abaixo do limite configurado.",
        "NO_CONSUMPTION_DATA": "Sem dados de consumo para estimar autonomia.",
    }[alert_type]

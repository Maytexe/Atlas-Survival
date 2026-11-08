from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import calculate_alerts
from app.services.dashboard import load_domain_items
from app.services.messages import alert_message


async def build_alerts(
    session: AsyncSession,
    today: date,
    low_stock_days: int,
) -> list[dict[str, Any]]:
    items = await load_domain_items(session)
    item_names = {item.id: item.name for item in items}
    alerts = calculate_alerts(
        items=items,
        today=today,
        low_stock_days=low_stock_days,
    )
    return [
        {
            **alert,
            "item_name": item_names[alert["item_id"]],
            "message": alert_message(alert["type"]),
        }
        for alert in alerts
    ]

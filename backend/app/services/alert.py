from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import calculate_alerts, evaluate_goals
from app.services.dashboard import load_domain_items
from app.services.messages import alert_message, below_goal_message


async def build_alerts(
    session: AsyncSession,
    today: date,
    low_stock_days: int,
    goal_food_days: int | None = None,
    goal_water_days: int | None = None,
) -> list[dict[str, Any]]:
    items = await load_domain_items(session)
    item_names = {item.id: item.name for item in items}
    alerts = calculate_alerts(
        items=items,
        today=today,
        low_stock_days=low_stock_days,
        goal_food_days=goal_food_days,
        goal_water_days=goal_water_days,
    )
    goals_by_item = {
        goal["limiting_item"]: goal
        for goal in evaluate_goals(
            items=items,
            today=today,
            goal_food_days=goal_food_days,
            goal_water_days=goal_water_days,
        )
        if goal["status"] == "BELOW" and goal["limiting_item"] is not None
    }
    results: list[dict[str, Any]] = []
    for alert in alerts:
        message = alert_message(alert["type"])
        if alert["type"] == "BELOW_GOAL":
            goal = goals_by_item[alert["item_id"]]
            assert goal["goal_days"] is not None
            message = below_goal_message(
                goal["missing_base"],
                goal["base_unit"],
                goal["goal_days"],
            )
        results.append(
            {
                **alert,
                "item_name": item_names[alert["item_id"]],
                "message": message,
            }
        )
    return results

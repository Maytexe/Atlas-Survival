from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import ReadSession, Today
from app.core.config import settings
from app.schemas import AlertData
from app.services import build_alerts

router = APIRouter()


@router.get("/alerts", response_model=list[AlertData])
async def get_alerts(
    session: ReadSession,
    today: Today,
    goal_food_days: Annotated[int | None, Query(ge=1, le=365)] = None,
    goal_water_days: Annotated[int | None, Query(ge=1, le=365)] = None,
) -> list[dict[str, Any]]:
    return await build_alerts(
        session,
        today,
        settings.low_stock_days,
        goal_food_days,
        goal_water_days,
    )

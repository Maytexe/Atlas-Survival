from typing import Annotated, Any, cast

from fastapi import APIRouter, Query

from app.api.deps import ReadSession, Today
from app.schemas import DashboardResponse
from app.services import build_dashboard

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    response_model_exclude_unset=True,
)
async def get_dashboard(
    session: ReadSession,
    today: Today,
    goal_food_days: Annotated[int | None, Query(ge=1, le=365)] = None,
    goal_water_days: Annotated[int | None, Query(ge=1, le=365)] = None,
) -> dict[str, Any]:
    return cast(
        dict[str, Any],
        await build_dashboard(session, today, goal_food_days, goal_water_days),
    )

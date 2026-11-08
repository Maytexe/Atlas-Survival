from typing import Any

from fastapi import APIRouter

from app.api.deps import ReadSession, Today
from app.core.config import settings
from app.services import build_alerts

router = APIRouter()


@router.get("/alerts")
async def get_alerts(session: ReadSession, today: Today) -> list[dict[str, Any]]:
    return await build_alerts(session, today, settings.low_stock_days)

from typing import Any

from fastapi import APIRouter

from app.api.deps import ReadSession, Today
from app.services import build_dashboard

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(session: ReadSession, today: Today) -> dict[str, Any]:
    return await build_dashboard(session, today)

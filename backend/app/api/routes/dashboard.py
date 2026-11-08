from typing import Any, cast

from fastapi import APIRouter

from app.api.deps import ReadSession, Today
from app.services import build_dashboard

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(session: ReadSession, today: Today) -> dict[str, Any]:
    return cast(dict[str, Any], await build_dashboard(session, today))

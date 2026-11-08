from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import ReadSession
from app.db.session import get_session_factory
from app.db.writes import write_transaction
from app.schemas import PullResponse, PushRequest
from app.services import pull_changes, push_mutation

router = APIRouter()


@router.post("/sync/push")
async def push_sync(
    request: PushRequest,
    session_factory: Annotated[
        async_sessionmaker[AsyncSession],
        Depends(get_session_factory),
    ],
) -> dict[str, list[dict[str, Any]]]:
    results: list[dict[str, Any]] = []
    for mutation in request.mutations:
        async with write_transaction(session_factory) as session:
            results.append(await push_mutation(session, mutation))
    return {"results": results}


@router.get("/sync/pull", response_model=PullResponse)
async def pull_sync(
    session: ReadSession,
    cursor: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    return await pull_changes(session, cursor)

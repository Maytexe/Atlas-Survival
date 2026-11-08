import logging
import uuid
from datetime import date
from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, FastAPI, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.types import ExceptionHandler

from app.core.config import settings
from app.core.dependencies import get_today
from app.db.session import (
    get_session,
    get_session_factory,
    get_write_session,
    write_transaction,
)
from app.models import Category, HouseholdMember, InventoryItem, StockBatch
from app.schemas import (
    BatchCreate,
    BatchRead,
    BatchUpdate,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    InventoryCreate,
    InventoryRead,
    InventoryUpdate,
    MemberCreate,
    MemberRead,
    MemberUpdate,
    ProblemDetails,
    PullResponse,
    PushRequest,
)
from app.services import (
    build_alerts,
    build_dashboard,
    create_batch,
    create_category,
    create_inventory_item,
    create_member,
    get_active,
    list_active,
    list_item_batches,
    pull_changes,
    push_mutation,
    soft_delete,
    update_record,
)

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api",
    responses={status_code: {"model": ProblemDetails} for status_code in (400, 404, 409, 422, 500)},
)
ReadSession = Annotated[AsyncSession, Depends(get_session)]
WriteSession = Annotated[AsyncSession, Depends(get_write_session)]
Today = Annotated[date, Depends(get_today)]


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/members", response_model=list[MemberRead])
async def get_members(session: ReadSession) -> list[HouseholdMember]:
    return await list_active(session, HouseholdMember)


@router.post(
    "/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_member(data: MemberCreate, session: WriteSession) -> HouseholdMember:
    return await create_member(session, data)


@router.patch("/members/{member_id}", response_model=MemberRead)
async def patch_member(
    member_id: uuid.UUID,
    data: MemberUpdate,
    session: WriteSession,
) -> HouseholdMember:
    return await update_record(session, HouseholdMember, member_id, data)


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(member_id: uuid.UUID, session: WriteSession) -> None:
    await soft_delete(session, HouseholdMember, member_id)


@router.get("/categories", response_model=list[CategoryRead])
async def get_categories(session: ReadSession) -> list[Category]:
    return await list_active(session, Category)


@router.post(
    "/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_category(data: CategoryCreate, session: WriteSession) -> Category:
    return await create_category(session, data)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
async def patch_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    session: WriteSession,
) -> Category:
    return await update_record(session, Category, category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, session: WriteSession) -> None:
    await soft_delete(session, Category, category_id)


@router.get("/inventory", response_model=list[InventoryRead])
async def get_inventory(session: ReadSession) -> list[InventoryItem]:
    return await list_active(session, InventoryItem)


@router.post(
    "/inventory",
    response_model=InventoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_inventory_item(
    data: InventoryCreate,
    session: WriteSession,
) -> InventoryItem:
    return await create_inventory_item(session, data)


@router.patch("/inventory/{item_id}", response_model=InventoryRead)
async def patch_inventory_item(
    item_id: uuid.UUID,
    data: InventoryUpdate,
    session: WriteSession,
) -> InventoryItem:
    return await update_record(session, InventoryItem, item_id, data)


@router.delete("/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(item_id: uuid.UUID, session: WriteSession) -> None:
    await soft_delete(session, InventoryItem, item_id)


@router.get("/inventory/{item_id}/batches", response_model=list[BatchRead])
async def get_item_batches(
    item_id: uuid.UUID,
    session: ReadSession,
) -> list[StockBatch]:
    await get_active(session, InventoryItem, item_id)
    return await list_item_batches(session, item_id)


@router.post(
    "/inventory/{item_id}/batches",
    response_model=BatchRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_item_batch(
    item_id: uuid.UUID,
    data: BatchCreate,
    session: WriteSession,
) -> StockBatch:
    return await create_batch(session, item_id, data)


@router.get("/batches/{batch_id}", response_model=BatchRead)
async def get_batch(batch_id: uuid.UUID, session: ReadSession) -> StockBatch:
    return await get_active(session, StockBatch, batch_id)


@router.patch("/batches/{batch_id}", response_model=BatchRead)
async def patch_batch(
    batch_id: uuid.UUID,
    data: BatchUpdate,
    session: WriteSession,
) -> StockBatch:
    return await update_record(session, StockBatch, batch_id, data)


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(batch_id: uuid.UUID, session: WriteSession) -> None:
    await soft_delete(session, StockBatch, batch_id)


@router.get("/dashboard")
async def get_dashboard(session: ReadSession, today: Today) -> dict[str, Any]:
    return await build_dashboard(session, today)


@router.get("/alerts")
async def get_alerts(session: ReadSession, today: Today) -> list[dict[str, Any]]:
    return await build_alerts(session, today, settings.low_stock_days)


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


def _problem_response(
    *,
    status_code: int,
    title: str,
    detail: str,
    instance: str | None = None,
    problem_type: str = "about:blank",
) -> JSONResponse:
    body = {
        "type": problem_type,
        "title": title,
        "status": status_code,
        "detail": detail,
    }
    if instance is not None:
        body["instance"] = instance
    return JSONResponse(
        status_code=status_code,
        content=body,
        media_type="application/problem+json",
    )


def install_problem_handlers(app: FastAPI) -> None:
    from fastapi.exceptions import RequestValidationError
    from sqlalchemy.exc import IntegrityError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    from app.core.errors import ProblemError

    async def handle_problem_error(request: Request, error: ProblemError) -> JSONResponse:
        return _problem_response(
            status_code=error.status,
            title=error.title,
            detail=error.detail,
            instance=request.url.path,
            problem_type=error.type,
        )

    async def handle_validation_error(
        request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        del error
        return _problem_response(
            status_code=422,
            title="Dados inválidos",
            detail="Revise os dados enviados e tente novamente.",
            instance=request.url.path,
        )

    async def handle_integrity_error(
        request: Request,
        error: IntegrityError,
    ) -> JSONResponse:
        del error
        return _problem_response(
            status_code=409,
            title="Conflito",
            detail="A operação viola uma restrição dos dados.",
            instance=request.url.path,
        )

    async def handle_http_error(
        request: Request,
        error: StarletteHTTPException,
    ) -> JSONResponse:
        titles = {400: "Solicitação inválida", 404: "Não encontrado"}
        detail = (
            error.detail
            if isinstance(error.detail, str)
            else "A solicitação não pode ser atendida."
        )
        return _problem_response(
            status_code=error.status_code,
            title=titles.get(error.status_code, "Erro na solicitação"),
            detail=detail,
            instance=request.url.path,
        )

    async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
        logger.error(
            "Erro interno ao processar %s",
            request.url.path,
            exc_info=(type(error), error, error.__traceback__),
        )
        return _problem_response(
            status_code=500,
            title="Erro interno",
            detail="Ocorreu um erro interno. Tente novamente.",
            instance=request.url.path,
        )

    app.add_exception_handler(ProblemError, cast(ExceptionHandler, handle_problem_error))
    app.add_exception_handler(
        RequestValidationError,
        cast(ExceptionHandler, handle_validation_error),
    )
    app.add_exception_handler(IntegrityError, cast(ExceptionHandler, handle_integrity_error))
    app.add_exception_handler(
        StarletteHTTPException,
        cast(ExceptionHandler, handle_http_error),
    )
    app.add_exception_handler(Exception, cast(ExceptionHandler, handle_unexpected_error))


def register_routes(app: FastAPI) -> None:
    app.include_router(router)
    install_problem_handlers(app)

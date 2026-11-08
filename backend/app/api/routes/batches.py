import uuid
from typing import cast

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import InventoryItem, StockBatch
from app.schemas import BatchCreate, BatchRead, BatchUpdate, SyncBatchCreate
from app.services import get_active, list_item_batches
from app.services.registry import ENTITY_OPERATIONS

router = APIRouter()


@router.get("/inventory/{item_id}/batches", response_model=list[BatchRead])
async def get_item_batches(item_id: uuid.UUID, session: ReadSession) -> list[StockBatch]:
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
    create_data = SyncBatchCreate.model_validate(
        {**data.model_dump(), "inventory_item_id": item_id}
    )
    return cast(StockBatch, await ENTITY_OPERATIONS["stock_batches"].create(session, create_data))


@router.get("/batches/{batch_id}", response_model=BatchRead)
async def get_batch(batch_id: uuid.UUID, session: ReadSession) -> StockBatch:
    return await get_active(session, StockBatch, batch_id)


@router.patch("/batches/{batch_id}", response_model=BatchRead)
async def patch_batch(
    batch_id: uuid.UUID,
    data: BatchUpdate,
    session: WriteSession,
) -> StockBatch:
    return cast(
        StockBatch,
        await ENTITY_OPERATIONS["stock_batches"].update(session, batch_id, data),
    )


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(batch_id: uuid.UUID, session: WriteSession) -> None:
    await ENTITY_OPERATIONS["stock_batches"].soft_delete(session, batch_id)

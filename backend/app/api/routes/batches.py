import uuid

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import InventoryItem, StockBatch
from app.schemas import BatchCreate, BatchRead, BatchUpdate
from app.services import create_batch, get_active, list_item_batches, soft_delete, update_record

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

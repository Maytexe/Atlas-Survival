import uuid

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import InventoryItem
from app.schemas import InventoryCreate, InventoryRead, InventoryUpdate
from app.services import create_inventory_item, list_active, soft_delete, update_record

router = APIRouter()


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

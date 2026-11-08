import uuid
from typing import cast

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import InventoryItem
from app.schemas import InventoryCreate, InventoryRead, InventoryUpdate
from app.services import list_active
from app.services.registry import ENTITY_OPERATIONS

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
    return cast(InventoryItem, await ENTITY_OPERATIONS["inventory_items"].create(session, data))


@router.patch("/inventory/{item_id}", response_model=InventoryRead)
async def patch_inventory_item(
    item_id: uuid.UUID,
    data: InventoryUpdate,
    session: WriteSession,
) -> InventoryItem:
    return cast(
        InventoryItem,
        await ENTITY_OPERATIONS["inventory_items"].update(session, item_id, data),
    )


@router.delete("/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(item_id: uuid.UUID, session: WriteSession) -> None:
    await ENTITY_OPERATIONS["inventory_items"].soft_delete(session, item_id)

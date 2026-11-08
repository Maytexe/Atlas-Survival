from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, HouseholdMember, InventoryItem, StockBatch
from app.schemas import (
    BatchUpdate,
    CategoryCreate,
    CategoryUpdate,
    InventoryCreate,
    InventoryUpdate,
    MemberCreate,
    MemberUpdate,
    SyncBatchCreate,
)
from app.services.adjust import adjust_batch
from app.services.batch import create_batch, delete_batch, update_batch
from app.services.category import create_category, delete_category, update_category
from app.services.inventory import (
    create_inventory_item,
    delete_inventory_item,
    update_inventory_item,
)
from app.services.member import create_member, delete_member, update_member
from app.services.records import Record

EntityOperation = Callable[..., Awaitable[Record]]
DeleteOperation = Callable[..., Awaitable[None]]
AdjustOperation = Callable[[AsyncSession, Record, BaseModel], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class EntityOperations:
    model: type[Record]
    create_schema: type[BaseModel]
    update_schema: type[BaseModel]
    create: EntityOperation
    update: EntityOperation
    soft_delete: DeleteOperation
    adjust: AdjustOperation | None = None


ENTITY_OPERATIONS: dict[str, EntityOperations] = {
    "household_members": EntityOperations(
        HouseholdMember,
        MemberCreate,
        MemberUpdate,
        create_member,
        update_member,
        delete_member,
    ),
    "categories": EntityOperations(
        Category,
        CategoryCreate,
        CategoryUpdate,
        create_category,
        update_category,
        delete_category,
    ),
    "inventory_items": EntityOperations(
        InventoryItem,
        InventoryCreate,
        InventoryUpdate,
        create_inventory_item,
        update_inventory_item,
        delete_inventory_item,
    ),
    "stock_batches": EntityOperations(
        StockBatch,
        SyncBatchCreate,
        BatchUpdate,
        create_batch,
        update_batch,
        delete_batch,
        adjust_batch,
    ),
}

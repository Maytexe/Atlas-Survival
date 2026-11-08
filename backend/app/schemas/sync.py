from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.batch import BatchRead
from app.schemas.category import CategoryRead
from app.schemas.common import DecimalInput, InputModel
from app.schemas.inventory import InventoryRead
from app.schemas.member import MemberRead


class MutationCreate(InputModel):
    id: UUID
    entity: Literal[
        "household_members",
        "categories",
        "inventory_items",
        "stock_batches",
    ]
    op: Literal["CREATE", "UPDATE", "DELETE", "ADJUST"]
    entity_id: UUID
    payload: dict[str, Any] = Field(default_factory=dict)
    client_ts: datetime
    attempts: int = Field(default=0, ge=0)


class AdjustPayload(InputModel):
    delta: DecimalInput


class PushRequest(InputModel):
    mutations: list[MutationCreate] = Field(max_length=1000)


class PullResponse(BaseModel):
    cursor: int
    household_members: list[MemberRead]
    categories: list[CategoryRead]
    inventory_items: list[InventoryRead]
    stock_batches: list[BatchRead]

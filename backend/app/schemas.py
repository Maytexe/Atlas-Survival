from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
)

from app.models import ConsumptionBasis, ItemKind, MemberType, Unit

DecimalString = Annotated[
    Decimal,
    Field(max_digits=14, decimal_places=3),
    PlainSerializer(lambda value: format(value, "f"), return_type=str),
]


def _require_decimal_string(value: object) -> object:
    if not isinstance(value, str | Decimal):
        raise ValueError("A quantidade deve ser enviada como texto decimal.")
    return value


DecimalInput = Annotated[
    Decimal,
    BeforeValidator(_require_decimal_string),
    Field(max_digits=14, decimal_places=3),
]
NonNegativeQuantity = Annotated[
    DecimalInput,
    Field(ge=0, max_digits=14, decimal_places=3),
]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MemberCreate(InputModel):
    id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    member_type: MemberType
    age: int | None = Field(default=None, ge=0)
    notes: str | None = None
    client_updated_at: datetime | None = None


class MemberUpdate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    member_type: MemberType | None = None
    age: int | None = Field(default=None, ge=0)
    notes: str | None = None


class MemberRead(BaseModel):
    id: UUID
    name: str
    member_type: MemberType
    age: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime
    change_seq: int
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(InputModel):
    id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    client_updated_at: datetime | None = None


class CategoryUpdate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class CategoryRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime
    change_seq: int
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class InventoryCreate(InputModel):
    id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category_id: UUID
    item_kind: ItemKind
    unit: Unit
    daily_consumption: (
        Annotated[
            DecimalInput,
            Field(ge=0, max_digits=14, decimal_places=3),
        ]
        | None
    ) = None
    consumption_basis: ConsumptionBasis = ConsumptionBasis.HOUSEHOLD
    client_updated_at: datetime | None = None


class InventoryUpdate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category_id: UUID | None = None
    item_kind: ItemKind | None = None
    unit: Unit | None = None
    daily_consumption: (
        Annotated[
            DecimalInput,
            Field(ge=0, max_digits=14, decimal_places=3),
        ]
        | None
    ) = None
    consumption_basis: ConsumptionBasis | None = None


class InventoryRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    category_id: UUID
    item_kind: ItemKind
    unit: Unit
    daily_consumption: DecimalString | None
    consumption_basis: ConsumptionBasis
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime
    change_seq: int
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class BatchCreate(InputModel):
    id: UUID | None = None
    quantity: NonNegativeQuantity
    expiration_date: date | None = None
    batch_number: str | None = Field(default=None, max_length=200)
    storage_location: str | None = Field(default=None, max_length=200)
    client_updated_at: datetime | None = None


class BatchUpdate(InputModel):
    quantity: NonNegativeQuantity | None = None
    expiration_date: date | None = None
    batch_number: str | None = Field(default=None, max_length=200)
    storage_location: str | None = Field(default=None, max_length=200)


class BatchRead(BaseModel):
    id: UUID
    inventory_item_id: UUID
    quantity: DecimalString
    expiration_date: date | None
    batch_number: str | None
    storage_location: str | None
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime
    change_seq: int
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SyncBatchCreate(BatchCreate):
    inventory_item_id: UUID


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


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None

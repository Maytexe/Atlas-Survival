from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ConsumptionBasis, ItemKind, Unit
from app.schemas.common import DecimalInput, DecimalString, InputModel


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

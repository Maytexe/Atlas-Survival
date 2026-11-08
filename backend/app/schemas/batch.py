from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DecimalString, InputModel, NonNegativeQuantity


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

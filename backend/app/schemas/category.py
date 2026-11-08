from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import InputModel


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

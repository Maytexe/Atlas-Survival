from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MemberType
from app.schemas.common import InputModel


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

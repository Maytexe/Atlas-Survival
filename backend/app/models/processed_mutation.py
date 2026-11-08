from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.models.base import Base


class ProcessedMutation(Base):
    __tablename__ = "processed_mutations"

    mutation_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

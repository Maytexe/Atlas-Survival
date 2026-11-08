import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, FetchedValue, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class SyncColumnsMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )
    client_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    change_seq: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import SyncColumnsMixin, UUIDPrimaryKeyMixin


class StockBatch(UUIDPrimaryKeyMixin, SyncColumnsMixin, Base):
    __tablename__ = "stock_batches"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="quantity_non_negative"),
        Index("ix_stock_batches_inventory_item_id", "inventory_item_id"),
        Index("ix_stock_batches_change_seq", "change_seq"),
        Index(
            "ix_stock_batches_inventory_item_id_expiration_date",
            "inventory_item_id",
            "expiration_date",
        ),
    )

    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    storage_location: Mapped[str | None] = mapped_column(String(200), nullable=True)

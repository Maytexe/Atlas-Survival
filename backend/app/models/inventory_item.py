import uuid
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import ConsumptionBasis, ItemKind, Unit, varchar_enum
from app.models.mixins import SyncColumnsMixin, UUIDPrimaryKeyMixin


class InventoryItem(UUIDPrimaryKeyMixin, SyncColumnsMixin, Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint(
            "daily_consumption IS NULL OR daily_consumption >= 0",
            name="daily_consumption_non_negative",
        ),
        Index("ix_inventory_items_category_id", "category_id"),
        Index("ix_inventory_items_change_seq", "change_seq"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    item_kind: Mapped[ItemKind] = mapped_column(
        varchar_enum(ItemKind, "item_kind"),
        nullable=False,
    )
    unit: Mapped[Unit] = mapped_column(varchar_enum(Unit, "unit"), nullable=False)
    daily_consumption: Mapped[Decimal | None] = mapped_column(Numeric(14, 3), nullable=True)
    consumption_basis: Mapped[ConsumptionBasis] = mapped_column(
        varchar_enum(ConsumptionBasis, "consumption_basis"),
        nullable=False,
    )

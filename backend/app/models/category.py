from sqlalchemy import Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import SyncColumnsMixin, UUIDPrimaryKeyMixin


class Category(UUIDPrimaryKeyMixin, SyncColumnsMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index(
            "uq_categories_active_name_lower",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_categories_change_seq", "change_seq"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

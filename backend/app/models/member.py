from sqlalchemy import CheckConstraint, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.enums import MemberType
from app.models.base import Base
from app.models.enums import varchar_enum
from app.models.mixins import SyncColumnsMixin, UUIDPrimaryKeyMixin


class HouseholdMember(UUIDPrimaryKeyMixin, SyncColumnsMixin, Base):
    __tablename__ = "household_members"
    __table_args__ = (
        CheckConstraint("age IS NULL OR age >= 0", name="age_non_negative"),
        Index("ix_household_members_change_seq", "change_seq"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    member_type: Mapped[MemberType] = mapped_column(
        varchar_enum(MemberType, "member_type"),
        nullable=False,
    )
    age: Mapped[int | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)

import enum

from sqlalchemy import Enum

from app.domain.enums import ConsumptionBasis, ItemKind, MemberType, Unit

__all__ = ["ConsumptionBasis", "ItemKind", "MemberType", "Unit", "varchar_enum"]


def _enum_values(
    enum_class: type[enum.Enum],
) -> list[str]:
    return [member.value for member in enum_class]


def varchar_enum(enum_class: type[enum.Enum], name: str) -> Enum:
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=_enum_values,
        length=max(len(member.value) for member in enum_class),
    )

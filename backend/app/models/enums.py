import enum

from sqlalchemy import Enum


class MemberType(enum.StrEnum):
    PERSON = "PERSON"
    ANIMAL = "ANIMAL"


class ItemKind(enum.StrEnum):
    FOOD = "FOOD"
    WATER = "WATER"
    OTHER = "OTHER"


class Unit(enum.StrEnum):
    KG = "kg"
    G = "g"
    L = "L"
    ML = "ml"
    UNIDADE = "unidade"
    PACOTE = "pacote"
    LATA = "lata"
    GARRAFA = "garrafa"


class ConsumptionBasis(enum.StrEnum):
    HOUSEHOLD = "HOUSEHOLD"
    PER_PERSON = "PER_PERSON"
    PER_ANIMAL = "PER_ANIMAL"


def _enum_values(enum_class: type[enum.Enum]) -> list[str]:
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

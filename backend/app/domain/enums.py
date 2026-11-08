import enum


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

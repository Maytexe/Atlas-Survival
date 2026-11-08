from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
)

DecimalString = Annotated[
    Decimal,
    Field(max_digits=14, decimal_places=3),
    PlainSerializer(lambda value: format(value, "f"), return_type=str),
]


def _require_decimal_string(value: object) -> object:
    if not isinstance(value, str | Decimal):
        raise ValueError("A quantidade deve ser enviada como texto decimal.")
    return value


DecimalInput = Annotated[
    Decimal,
    BeforeValidator(_require_decimal_string),
    Field(max_digits=14, decimal_places=3),
]
NonNegativeQuantity = Annotated[
    DecimalInput,
    Field(ge=0, max_digits=14, decimal_places=3),
]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None

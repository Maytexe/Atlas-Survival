from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class AlertType(StrEnum):
    EXPIRED = "EXPIRED"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    EXPIRING_SOON = "EXPIRING_SOON"
    LOW_STOCK = "LOW_STOCK"
    NO_CONSUMPTION_DATA = "NO_CONSUMPTION_DATA"
    BELOW_GOAL = "BELOW_GOAL"


class AlertData(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: AlertType

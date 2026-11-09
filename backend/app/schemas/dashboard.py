from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel, ConfigDict, Field


class GoalData(TypedDict):
    item_kind: Literal["FOOD", "WATER"]
    dimension: Literal["MASS", "VOLUME", "COUNT"]
    base_unit: str
    goal_days: int | None
    status: Literal["NO_GOAL", "NO_DATA", "MET", "BELOW"]
    available_base: str
    daily_base: str
    needed_base: str
    missing_base: str
    partial_coverage: bool
    coverage_count: int
    total_items: int


class DashboardResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    goals: list[GoalData] = Field(default_factory=list)


class DashboardData(TypedDict):
    total_items: int
    total_members: int
    people: int
    animals: int
    availability: dict[str, dict[str, str]]
    expired_batches: int
    expiring_soon_batches: int
    autonomy: list[dict[str, object]]
    today: str
    goals: NotRequired[list[GoalData]]

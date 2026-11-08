from typing import TypedDict


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

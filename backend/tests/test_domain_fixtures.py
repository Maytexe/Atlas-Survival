import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

from domain_fixtures import batch_from_fixture, from_fixture

from app.domain import (
    aggregate_autonomy,
    calculate_alerts,
    calculate_autonomy,
    calculate_dashboard,
    calculate_expiry,
    calculate_stock_availability,
    calculate_unit_base,
)
from app.domain.enums import Unit
from app.domain.goals import evaluate_goals

FIXTURES = Path(__file__).resolve().parents[2] / "shared" / "fixtures"


def _read_fixture(name: str) -> list[dict[str, Any]]:
    return cast(
        list[dict[str, Any]],
        json.loads((FIXTURES / name).read_text(encoding="utf-8")),
    )


def _decimal_string(value: object) -> str:
    if not isinstance(value, Decimal):
        raise TypeError("Esperava Decimal nos resultados do domínio.")
    return format(value.normalize(), "f")


def test_expiry_cases_match_shared_fixture() -> None:
    for case in _read_fixture("expiry-cases.json"):
        result = calculate_expiry(
            expiration_date=(
                date.fromisoformat(case["expiration_date"]) if case["expiration_date"] else None
            ),
            today=date.fromisoformat(case["today"]),
        )

        assert result == case["expected"], case["name"]


def test_unit_cases_match_shared_fixture() -> None:
    for case in _read_fixture("units-cases.json"):
        result = calculate_unit_base(
            unit=Unit(case["unit"]),
            quantity=Decimal(case["quantity"]),
        )

        assert result == {
            **case["expected"],
            "base_quantity": Decimal(case["expected"]["base_quantity"]),
        }, case["name"]


def test_availability_cases_match_shared_fixture() -> None:
    for case in _read_fixture("availability-cases.json"):
        result = calculate_stock_availability(
            batches=tuple(batch_from_fixture(batch) for batch in case["batches"]),
            today=date.fromisoformat(case["today"]),
        )

        assert result == {key: Decimal(value) for key, value in case["expected"].items()}, case[
            "name"
        ]


def test_autonomy_cases_match_shared_fixture() -> None:
    for case in _read_fixture("autonomy-cases.json"):
        items = tuple(from_fixture(item) for item in case["items"])
        results = [
            {"id": item.id, "days": calculate_autonomy(item, date.fromisoformat(case["today"]))}
            for item in items
        ]
        aggregates = aggregate_autonomy(
            items=items,
            today=date.fromisoformat(case["today"]),
        )

        assert {item["id"]: item["days"] for item in results} == case["expected"]["item_days"], (
            case["name"]
        )
        normalized_aggregates = [
            {
                **aggregate,
                "available_base": _decimal_string(aggregate["available_base"]),
                "daily_base": _decimal_string(aggregate["daily_base"]),
            }
            for aggregate in aggregates
        ]
        assert normalized_aggregates == case["expected"]["aggregates"], case["name"]


def test_alert_cases_match_shared_fixture() -> None:
    for case in _read_fixture("alerts-cases.json"):
        alerts = calculate_alerts(
            items=tuple(from_fixture(item) for item in case["items"]),
            today=date.fromisoformat(case["today"]),
            low_stock_days=case["low_stock_days"],
            goal_food_days=case.get("goal_food_days"),
            goal_water_days=case.get("goal_water_days"),
        )

        assert alerts == case["expected"], case["name"]


def test_dashboard_cases_match_shared_fixture() -> None:
    for case in _read_fixture("dashboard-cases.json"):
        result = calculate_dashboard(
            items=tuple(from_fixture(item) for item in case["items"]),
            today=date.fromisoformat(case["today"]),
        )
        expected = case["expected"]
        expected_availability = {
            key: {name: Decimal(value) for name, value in values.items()}
            for key, values in expected["availability"].items()
        }
        assert result["availability"] == expected_availability, case["name"]
        assert result["expired_batches"] == expected["expired_batches"], case["name"]
        assert result["expiring_soon_batches"] == expected["expiring_soon_batches"], case["name"]
        normalized_autonomy = [
            {
                **aggregate,
                "available_base": _decimal_string(aggregate["available_base"]),
                "daily_base": _decimal_string(aggregate["daily_base"]),
            }
            for aggregate in result["autonomy"]
        ]
        assert normalized_autonomy == expected["autonomy"], case["name"]


def test_goal_cases_match_shared_fixture() -> None:
    for case in _read_fixture("goal-cases.json"):
        result = evaluate_goals(
            items=tuple(from_fixture(item) for item in case["items"]),
            today=date.fromisoformat(case["today"]),
            goal_food_days=case["goal_food_days"],
            goal_water_days=case["goal_water_days"],
        )
        normalized = [
            {
                **goal,
                "available_base": _decimal_string(goal["available_base"]),
                "daily_base": _decimal_string(goal["daily_base"]),
                "needed_base": _decimal_string(goal["needed_base"]),
                "missing_base": _decimal_string(goal["missing_base"]),
            }
            for goal in result
        ]
        assert normalized == case["expected"], case["name"]

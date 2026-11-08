import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

from app.domain import (
    aggregate_autonomy,
    calculate_alerts,
    calculate_autonomy,
    calculate_expiry,
    calculate_stock_availability,
    calculate_unit_base,
)

FIXTURES = Path(__file__).resolve().parents[2] / "shared" / "fixtures"


def _read_fixture(name: str) -> list[dict[str, Any]]:
    return cast(
        list[dict[str, Any]],
        json.loads((FIXTURES / name).read_text(encoding="utf-8")),
    )


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
            unit=case["unit"],
            quantity=Decimal(case["quantity"]),
        )

        assert result == {
            **case["expected"],
            "base_quantity": Decimal(case["expected"]["base_quantity"]),
        }, case["name"]


def test_availability_cases_match_shared_fixture() -> None:
    for case in _read_fixture("availability-cases.json"):
        result = calculate_stock_availability(
            batches=case["batches"],
            today=date.fromisoformat(case["today"]),
        )

        assert result == {key: Decimal(value) for key, value in case["expected"].items()}, case[
            "name"
        ]


def test_autonomy_cases_match_shared_fixture() -> None:
    for case in _read_fixture("autonomy-cases.json"):
        results = [
            {
                "id": item["id"],
                "days": calculate_autonomy(item, date.fromisoformat(case["today"])),
            }
            for item in case["items"]
        ]
        aggregates = aggregate_autonomy(
            items=case["items"],
            today=date.fromisoformat(case["today"]),
        )

        assert {item["id"]: item["days"] for item in results} == case["expected"]["item_days"], (
            case["name"]
        )
        assert aggregates == case["expected"]["aggregates"], case["name"]


def test_alert_cases_match_shared_fixture() -> None:
    for case in _read_fixture("alerts-cases.json"):
        alerts = calculate_alerts(
            items=case["items"],
            today=date.fromisoformat(case["today"]),
            low_stock_days=case["low_stock_days"],
        )

        assert alerts == case["expected"], case["name"]

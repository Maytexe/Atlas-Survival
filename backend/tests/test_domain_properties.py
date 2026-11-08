from datetime import date
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from app.domain import calculate_autonomy, calculate_stock_availability


@given(
    quantity=st.decimals(
        min_value=Decimal("0"),
        max_value=Decimal("99999999999.999"),
        places=3,
        allow_nan=False,
        allow_infinity=False,
    ),
)
def test_autonomy_is_never_negative(quantity: Decimal) -> None:
    item = {
        "unit": "kg",
        "daily_consumption": "0.001",
        "consumption_basis": "HOUSEHOLD",
        "person_count": 0,
        "animal_count": 0,
        "batches": [
            {"quantity": str(quantity), "expiration_date": None},
        ],
    }

    result = calculate_autonomy(item, date(2026, 1, 15))

    assert result is None or result >= 0


@given(
    expired_quantity=st.decimals(
        min_value=Decimal("0"),
        max_value=Decimal("99999999999.999"),
        places=3,
        allow_nan=False,
        allow_infinity=False,
    ),
    current_quantity=st.decimals(
        min_value=Decimal("0"),
        max_value=Decimal("99999999999.999"),
        places=3,
        allow_nan=False,
        allow_infinity=False,
    ),
)
def test_expired_batches_never_contribute_to_availability(
    expired_quantity: Decimal,
    current_quantity: Decimal,
) -> None:
    result = calculate_stock_availability(
        batches=[
            {
                "quantity": str(expired_quantity),
                "expiration_date": "2026-01-14",
            },
            {
                "quantity": str(current_quantity),
                "expiration_date": "2026-01-15",
            },
        ],
        today=date(2026, 1, 15),
    )

    assert result["available"] == current_quantity
    assert result["expired_quantity"] == expired_quantity
    assert result["available"] + result["expired_quantity"] == (expired_quantity + current_quantity)

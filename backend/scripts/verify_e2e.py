import asyncio
import sys
from datetime import date
from decimal import Decimal

import asyncpg  # type: ignore[import-untyped]
from sqlalchemy.engine import make_url

from app.core.config import settings


async def verify_records(
    category_name: str,
    person_name: str,
    animal_name: str,
    item_name: str,
    storage_location: str,
    expiration_date: date,
) -> None:
    url = make_url(settings.database_url)
    connection = await asyncpg.connect(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        database=url.database,
    )
    try:
        category_id = await connection.fetchval(
            "SELECT id FROM categories WHERE name = $1 AND deleted_at IS NULL",
            category_name,
        )
        if category_id is None:
            raise AssertionError("A categoria E2E não foi persistida no PostgreSQL.")

        for name, member_type in ((person_name, "PERSON"), (animal_name, "ANIMAL")):
            member_exists = await connection.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1 FROM household_members
                    WHERE name = $1 AND member_type = $2 AND deleted_at IS NULL
                )
                """,
                name,
                member_type,
            )
            if not member_exists:
                raise AssertionError(f"O cadastro {name!r} não foi sincronizado.")

        item_id = await connection.fetchval(
            """
            SELECT id FROM inventory_items
            WHERE name = $1 AND category_id = $2 AND deleted_at IS NULL
            """,
            item_name,
            category_id,
        )
        if item_id is None:
            raise AssertionError("O item E2E não foi sincronizado.")

        batch_exists = await connection.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM stock_batches
                WHERE inventory_item_id = $1
                  AND quantity = $2
                  AND expiration_date = $3
                  AND storage_location = $4
                  AND deleted_at IS NULL
            )
            """,
            item_id,
            Decimal("8.000"),
            expiration_date,
            storage_location,
        )
        if not batch_exists:
            raise AssertionError("O lote E2E não foi persistido no PostgreSQL.")
    finally:
        await connection.close()


def main() -> None:
    if len(sys.argv) != 7:
        raise SystemExit("Uso: verify_e2e.py categoria pessoa animal item local validade")
    asyncio.run(
        verify_records(
            sys.argv[1],
            sys.argv[2],
            sys.argv[3],
            sys.argv[4],
            sys.argv[5],
            date.fromisoformat(sys.argv[6]),
        )
    )
    print("PostgreSQL confirmou pessoa, animal, categoria, item e lote do E2E.")


if __name__ == "__main__":
    main()

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.registry import ENTITY_OPERATIONS


async def pull_changes(session: AsyncSession, cursor: int) -> dict[str, Any]:
    highest_sequences = [
        await session.scalar(select(func.max(operation.model.change_seq)))
        for operation in ENTITY_OPERATIONS.values()
    ]
    watermark = max([cursor, *(sequence or 0 for sequence in highest_sequences)])
    rows_by_entity: dict[str, list[Any]] = {}
    for entity, operation in ENTITY_OPERATIONS.items():
        model = operation.model
        records = await session.scalars(
            select(model)
            .where(model.change_seq > cursor, model.change_seq <= watermark)
            .order_by(model.change_seq)
            .limit(1001)
        )
        rows_by_entity[entity] = list(records)
    all_changes = sorted(
        (
            (record.change_seq, entity, record)
            for entity, records in rows_by_entity.items()
            for record in records
        ),
        key=lambda change: change[0],
    )
    response: dict[str, Any] = {entity: [] for entity in ENTITY_OPERATIONS}
    for _sequence, entity, record in all_changes[:1000]:
        response[entity].append(record)
    if len(all_changes) > 1000:
        response["cursor"] = all_changes[999][0]
    else:
        response["cursor"] = watermark
    return response

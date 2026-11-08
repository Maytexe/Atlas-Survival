from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import invalid
from app.models import StockBatch
from app.schemas import AdjustPayload
from app.services.records import Record


async def adjust_batch(
    session: AsyncSession,
    record: Record,
    payload: BaseModel,
) -> None:
    if not isinstance(record, StockBatch) or not isinstance(payload, AdjustPayload):
        raise invalid("ADJUST só pode ser aplicado a um lote.")
    new_quantity = record.quantity + payload.delta
    if new_quantity < 0:
        raise invalid("O ajuste não pode deixar a quantidade negativa.")
    record.quantity = new_quantity
    await session.flush()

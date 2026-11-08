from typing import Any, cast

from pydantic import BaseModel, ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ProblemError, conflict, invalid, not_found
from app.models import (
    Category,
    InventoryItem,
    ProcessedMutation,
    StockBatch,
)
from app.schemas import (
    AdjustPayload,
    BatchUpdate,
    CategoryCreate,
    CategoryUpdate,
    InventoryCreate,
    InventoryUpdate,
    MemberCreate,
    MemberUpdate,
    MutationCreate,
    SyncBatchCreate,
)
from app.services.records import ENTITY_MODELS, Record, get_active

ENTITY_CREATE_SCHEMAS: dict[str, type[BaseModel]] = {
    "household_members": MemberCreate,
    "categories": CategoryCreate,
    "inventory_items": InventoryCreate,
    "stock_batches": SyncBatchCreate,
}
ENTITY_UPDATE_SCHEMAS: dict[str, type[BaseModel]] = {
    "household_members": MemberUpdate,
    "categories": CategoryUpdate,
    "inventory_items": InventoryUpdate,
    "stock_batches": BatchUpdate,
}


def _validate_payload[T: BaseModel](schema: type[T], payload: dict[str, Any]) -> T:
    try:
        return schema.model_validate(payload)
    except ValidationError as error:
        raise invalid("O conteúdo da mutação não é válido.") from error


async def _sync_record(
    session: AsyncSession,
    mutation: MutationCreate,
) -> dict[str, Any]:
    model = ENTITY_MODELS[mutation.entity]
    timestamp = mutation.client_ts
    if mutation.op == "CREATE":
        if await session.get(model, mutation.entity_id) is not None:
            raise conflict("O identificador do registro já existe.")
        schema = ENTITY_CREATE_SCHEMAS[mutation.entity]
        data = _validate_payload(schema, {**mutation.payload, "id": mutation.entity_id})
        values = data.model_dump(exclude={"client_updated_at"})
        values["id"] = mutation.entity_id
        values["client_updated_at"] = timestamp
        if mutation.entity == "inventory_items":
            await get_active(session, Category, values["category_id"])
        elif mutation.entity == "stock_batches":
            await get_active(session, InventoryItem, values["inventory_item_id"])
        session.add(model(**values))
        await session.flush()
        return {"status": "applied"}

    record = cast(Record | None, await session.get(model, mutation.entity_id))
    if record is None:
        raise not_found("O registro da mutação não foi encontrado.")
    if record.deleted_at is not None or (
        mutation.op != "ADJUST" and timestamp < record.client_updated_at
    ):
        return {"status": "stale"}

    if mutation.op == "UPDATE":
        data = _validate_payload(ENTITY_UPDATE_SCHEMAS[mutation.entity], mutation.payload)
        if mutation.entity == "inventory_items" and isinstance(data, InventoryUpdate):
            if data.category_id is not None:
                await get_active(session, Category, data.category_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(record, field, value)
        record.client_updated_at = timestamp
        await session.flush()
        return {"status": "applied"}

    if mutation.op == "DELETE":
        if mutation.entity == "categories":
            active_item = await session.scalar(
                select(InventoryItem.id)
                .where(
                    InventoryItem.category_id == mutation.entity_id,
                    InventoryItem.deleted_at.is_(None),
                )
                .limit(1)
            )
            if active_item is not None:
                raise conflict("Não é possível excluir uma categoria que possui itens ativos.")
        if mutation.entity == "inventory_items":
            await session.execute(
                update(StockBatch)
                .where(StockBatch.inventory_item_id == mutation.entity_id)
                .values(deleted_at=timestamp, client_updated_at=timestamp)
            )
        record.deleted_at = timestamp
        record.client_updated_at = timestamp
        await session.flush()
        return {"status": "applied"}

    if mutation.op == "ADJUST":
        if mutation.entity != "stock_batches":
            raise invalid("ADJUST só pode ser aplicado a um lote.")
        if not isinstance(record, StockBatch):
            raise not_found("O lote da mutação não foi encontrado.")
        data = _validate_payload(AdjustPayload, mutation.payload)
        new_quantity = record.quantity + data.delta
        if new_quantity < 0:
            raise invalid("O ajuste não pode deixar a quantidade negativa.")
        record.quantity = new_quantity
        await session.flush()
        return {"status": "applied"}

    raise invalid("Operação de sincronização inválida.")


async def push_mutation(
    session: AsyncSession,
    mutation: MutationCreate,
) -> dict[str, Any]:
    existing = await session.get(ProcessedMutation, mutation.id)
    if existing is not None:
        return {"mutation_id": str(mutation.id), "status": "duplicate"}
    try:
        async with session.begin_nested():
            result = await _sync_record(session, mutation)
    except ProblemError as error:
        result = {
            "status": "rejected",
            "problem": {
                "type": error.type,
                "title": error.title,
                "status": error.status,
                "detail": error.detail,
            },
        }
    except IntegrityError:
        result = {
            "status": "rejected",
            "problem": {
                "type": "about:blank",
                "title": "Conflito",
                "status": 409,
                "detail": "A mutação viola uma restrição dos dados.",
            },
        }
    except (ValidationError, ValueError, ArithmeticError):
        result = {
            "status": "rejected",
            "problem": {
                "type": "about:blank",
                "title": "Dados inválidos",
                "status": 422,
                "detail": "O conteúdo da mutação não é válido.",
            },
        }
    session.add(ProcessedMutation(mutation_id=mutation.id, result=result))
    await session.flush()
    return {"mutation_id": str(mutation.id), **result}

from typing import Any, cast

from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ProblemError, conflict, invalid, not_found
from app.models import ProcessedMutation
from app.schemas import AdjustPayload, MutationCreate
from app.services.records import Record
from app.services.registry import ENTITY_OPERATIONS


def _validate_payload[T: BaseModel](schema: type[T], payload: dict[str, Any]) -> T:
    try:
        return schema.model_validate(payload)
    except ValidationError as error:
        raise invalid("O conteúdo da mutação não é válido.") from error


async def _apply_mutation(
    session: AsyncSession,
    mutation: MutationCreate,
) -> dict[str, Any]:
    operation = ENTITY_OPERATIONS[mutation.entity]
    timestamp = mutation.client_ts
    if mutation.op == "CREATE":
        if await session.get(operation.model, mutation.entity_id) is not None:
            raise conflict("O identificador do registro já existe.")
        data = _validate_payload(
            operation.create_schema,
            {**mutation.payload, "id": mutation.entity_id},
        )
        await operation.create(session, data, timestamp)
        return {"status": "applied"}

    record = cast(Record | None, await session.get(operation.model, mutation.entity_id))
    if record is None:
        raise not_found("O registro da mutação não foi encontrado.")
    if record.deleted_at is not None or (
        mutation.op != "ADJUST" and timestamp < record.client_updated_at
    ):
        return {"status": "stale"}

    if mutation.op == "UPDATE":
        data = _validate_payload(operation.update_schema, mutation.payload)
        await operation.update(session, mutation.entity_id, data, timestamp)
        return {"status": "applied"}

    if mutation.op == "DELETE":
        await operation.soft_delete(session, mutation.entity_id, timestamp)
        return {"status": "applied"}

    if mutation.op == "ADJUST":
        if operation.adjust is None:
            raise invalid("ADJUST só pode ser aplicado a um lote.")
        data = _validate_payload(AdjustPayload, mutation.payload)
        await operation.adjust(session, record, data)
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
            result = await _apply_mutation(session, mutation)
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

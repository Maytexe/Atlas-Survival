import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, cast

from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ProblemError, conflict, invalid, not_found
from app.domain import (
    aggregate_autonomy,
    calculate_alerts,
    calculate_expiry,
    calculate_stock_availability,
    calculate_unit_base,
)
from app.models import Category, HouseholdMember, InventoryItem, ProcessedMutation, StockBatch
from app.schemas import (
    AdjustPayload,
    BatchCreate,
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

Record = HouseholdMember | Category | InventoryItem | StockBatch
ENTITY_MODELS: dict[
    str,
    type[HouseholdMember] | type[Category] | type[InventoryItem] | type[StockBatch],
] = {
    "household_members": HouseholdMember,
    "categories": Category,
    "inventory_items": InventoryItem,
    "stock_batches": StockBatch,
}
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


def _now_utc() -> datetime:
    return datetime.now(UTC)


def _validate_payload[T: BaseModel](schema: type[T], payload: dict[str, Any]) -> T:
    try:
        return schema.model_validate(payload)
    except ValidationError as error:
        raise invalid("O conteúdo da mutação não é válido.") from error


async def list_active[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
) -> list[T]:
    result = await session.scalars(
        select(model)
        .where(model.deleted_at.is_(None))
        .order_by(model.created_at, model.id)
        .limit(1000)
    )
    return list(result)


async def get_active[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
    entity_id: uuid.UUID,
) -> T:
    record = await session.get(model, entity_id)
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    return record


async def list_item_batches(
    session: AsyncSession,
    inventory_item_id: uuid.UUID,
) -> list[StockBatch]:
    records = await session.scalars(
        select(StockBatch)
        .where(
            StockBatch.inventory_item_id == inventory_item_id,
            StockBatch.deleted_at.is_(None),
        )
        .order_by(StockBatch.expiration_date.nulls_last(), StockBatch.id)
        .limit(1000)
    )
    return list(records)


async def create_member(session: AsyncSession, data: MemberCreate) -> HouseholdMember:
    member = HouseholdMember(
        id=data.id or uuid.uuid4(),
        name=data.name,
        member_type=data.member_type,
        age=data.age,
        notes=data.notes,
        client_updated_at=data.client_updated_at or _now_utc(),
    )
    session.add(member)
    await session.flush()
    return member


async def create_category(session: AsyncSession, data: CategoryCreate) -> Category:
    category = Category(
        id=data.id or uuid.uuid4(),
        name=data.name,
        description=data.description,
        client_updated_at=data.client_updated_at or _now_utc(),
    )
    session.add(category)
    await session.flush()
    return category


async def create_inventory_item(
    session: AsyncSession,
    data: InventoryCreate,
) -> InventoryItem:
    await get_active(session, Category, data.category_id)
    item = InventoryItem(
        id=data.id or uuid.uuid4(),
        name=data.name,
        description=data.description,
        category_id=data.category_id,
        item_kind=data.item_kind,
        unit=data.unit,
        daily_consumption=data.daily_consumption,
        consumption_basis=data.consumption_basis,
        client_updated_at=data.client_updated_at or _now_utc(),
    )
    session.add(item)
    await session.flush()
    return item


async def create_batch(
    session: AsyncSession,
    inventory_item_id: uuid.UUID,
    data: BatchCreate,
) -> StockBatch:
    await get_active(session, InventoryItem, inventory_item_id)
    batch = StockBatch(
        id=data.id or uuid.uuid4(),
        inventory_item_id=inventory_item_id,
        quantity=data.quantity,
        expiration_date=data.expiration_date,
        batch_number=data.batch_number,
        storage_location=data.storage_location,
        client_updated_at=data.client_updated_at or _now_utc(),
    )
    session.add(batch)
    await session.flush()
    return batch


async def update_record[T: (HouseholdMember, Category, InventoryItem, StockBatch)](
    session: AsyncSession,
    model: type[T],
    entity_id: uuid.UUID,
    data: BaseModel,
    *,
    client_ts: datetime | None = None,
) -> T:
    record = cast(Record | None, await session.get(model, entity_id))
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    if model is InventoryItem and isinstance(data, InventoryUpdate):
        category_id = data.category_id
        if category_id is not None:
            await get_active(session, Category, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    record.client_updated_at = client_ts or _now_utc()
    await session.flush()
    return cast(T, record)


async def soft_delete(
    session: AsyncSession,
    model: type[Category] | type[HouseholdMember] | type[InventoryItem] | type[StockBatch],
    entity_id: uuid.UUID,
    *,
    client_ts: datetime | None = None,
) -> None:
    record = cast(Record | None, await session.get(model, entity_id))
    if record is None or record.deleted_at is not None:
        raise not_found("O registro solicitado não foi encontrado.")
    timestamp = client_ts or _now_utc()
    if model is Category:
        active_item = await session.scalar(
            select(InventoryItem.id)
            .where(
                InventoryItem.category_id == entity_id,
                InventoryItem.deleted_at.is_(None),
            )
            .limit(1)
        )
        if active_item is not None:
            raise conflict("Não é possível excluir uma categoria que possui itens ativos.")
    if model is InventoryItem:
        await session.execute(
            update(StockBatch)
            .where(StockBatch.inventory_item_id == entity_id)
            .values(deleted_at=timestamp, client_updated_at=timestamp)
        )
    record.deleted_at = timestamp
    record.client_updated_at = timestamp
    await session.flush()


async def _load_domain_items(session: AsyncSession) -> list[dict[str, Any]]:
    member_types = list(
        await session.scalars(
            select(HouseholdMember.member_type).where(HouseholdMember.deleted_at.is_(None))
        )
    )
    person_count = sum(member.value == "PERSON" for member in member_types)
    animal_count = sum(member.value == "ANIMAL" for member in member_types)
    items = list(
        await session.scalars(
            select(InventoryItem)
            .where(InventoryItem.deleted_at.is_(None))
            .order_by(InventoryItem.name, InventoryItem.id)
            .limit(1000)
        )
    )
    batches = list(
        await session.scalars(
            select(StockBatch)
            .where(StockBatch.deleted_at.is_(None))
            .order_by(StockBatch.expiration_date, StockBatch.id)
        )
    )
    batches_by_item: dict[uuid.UUID, list[dict[str, object]]] = {}
    for batch in batches:
        batches_by_item.setdefault(batch.inventory_item_id, []).append(
            {
                "id": str(batch.id),
                "quantity": batch.quantity,
                "expiration_date": batch.expiration_date,
            }
        )
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "item_kind": item.item_kind.value,
            "unit": item.unit.value,
            "daily_consumption": item.daily_consumption,
            "consumption_basis": item.consumption_basis.value,
            "person_count": person_count,
            "animal_count": animal_count,
            "batches": batches_by_item.get(item.id, []),
        }
        for item in items
    ]


async def build_dashboard(session: AsyncSession, today: date) -> dict[str, Any]:
    items = await _load_domain_items(session)
    members = list(
        await session.scalars(select(HouseholdMember).where(HouseholdMember.deleted_at.is_(None)))
    )
    availability: dict[str, dict[str, Decimal]] = {}
    expired_batch_count = 0
    expiring_batch_count = 0
    for item in items:
        item_availability = calculate_stock_availability(
            batches=item["batches"],
            today=today,
        )
        dimension = calculate_unit_base(
            unit=item["unit"],
            quantity=Decimal("1"),
        )["dimension"]
        if item["item_kind"] in {"FOOD", "WATER"}:
            base_unit = calculate_unit_base(
                unit=item["unit"],
                quantity=Decimal("1"),
            )["base_unit"]
            suffix = f":{base_unit}" if dimension == "COUNT" else ""
            key = f"{item['item_kind']}:{dimension}{suffix}"
            available_base = calculate_unit_base(
                unit=item["unit"],
                quantity=item_availability["available"],
            )["base_quantity"]
            availability.setdefault(key, {}).setdefault("available", Decimal("0"))
            availability[key]["available"] += available_base
        for batch in item["batches"]:
            expiry = calculate_expiry(
                expiration_date=batch["expiration_date"],
                today=today,
            )
            expired_batch_count += int(expiry["expired"])
            expiring_batch_count += int(expiry["expiring_soon"])
    return {
        "total_items": len(items),
        "total_members": len(members),
        "people": sum(member.member_type.value == "PERSON" for member in members),
        "animals": sum(member.member_type.value == "ANIMAL" for member in members),
        "availability": {
            key: {name: format(value, "f") for name, value in values.items()}
            for key, values in sorted(availability.items())
        },
        "expired_batches": expired_batch_count,
        "expiring_soon_batches": expiring_batch_count,
        "autonomy": aggregate_autonomy(items=items, today=today),
        "sync_status": "Online",
        "today": today.isoformat(),
    }


async def build_alerts(
    session: AsyncSession,
    today: date,
    low_stock_days: int,
) -> list[dict[str, Any]]:
    items = await _load_domain_items(session)
    item_names = {item["id"]: item["name"] for item in items}
    alerts = calculate_alerts(
        items=items,
        today=today,
        low_stock_days=low_stock_days,
    )
    return [
        {
            **alert,
            "item_name": item_names[alert["item_id"]],
            "message": _alert_message(alert["type"]),
        }
        for alert in alerts
    ]


def _alert_message(alert_type: str) -> str:
    return {
        "EXPIRED": "Lote vencido.",
        "OUT_OF_STOCK": "Item sem estoque disponível.",
        "EXPIRING_SOON": "Lote vence em até 30 dias.",
        "LOW_STOCK": "Autonomia abaixo do limite configurado.",
        "NO_CONSUMPTION_DATA": "Sem dados de consumo para estimar autonomia.",
    }[alert_type]


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
        payload = {**mutation.payload, "id": mutation.entity_id}
        data = _validate_payload(schema, payload)
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
        schema = ENTITY_UPDATE_SCHEMAS[mutation.entity]
        data = _validate_payload(schema, mutation.payload)
        if mutation.entity == "inventory_items" and isinstance(data, InventoryUpdate):
            category_id = data.category_id
            if category_id is not None:
                await get_active(session, Category, category_id)
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
        delta = data.delta
        new_quantity = record.quantity + delta
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
    session.add(
        ProcessedMutation(
            mutation_id=mutation.id,
            result=result,
        )
    )
    await session.flush()
    return {"mutation_id": str(mutation.id), **result}


async def pull_changes(session: AsyncSession, cursor: int) -> dict[str, Any]:
    highest_sequences = [
        await session.scalar(select(func.max(model.change_seq))) for model in ENTITY_MODELS.values()
    ]
    watermark = max([cursor, *(sequence or 0 for sequence in highest_sequences)])
    rows_by_entity: dict[str, list[Any]] = {}
    for entity, model in ENTITY_MODELS.items():
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
    response: dict[str, Any] = {entity: [] for entity in ENTITY_MODELS}
    for _sequence, entity, record in all_changes[:1000]:
        response[entity].append(record)
    if len(all_changes) > 1000:
        response["cursor"] = all_changes[999][0]
    else:
        response["cursor"] = watermark
    return response

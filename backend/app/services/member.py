import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HouseholdMember
from app.schemas import MemberCreate, MemberUpdate
from app.services.records import now_utc, soft_delete, update_record


async def create_member(
    session: AsyncSession,
    data: MemberCreate,
    client_ts: datetime | None = None,
) -> HouseholdMember:
    member = HouseholdMember(
        id=data.id or uuid.uuid4(),
        name=data.name,
        member_type=data.member_type,
        age=data.age,
        notes=data.notes,
        client_updated_at=client_ts or data.client_updated_at or now_utc(),
    )
    session.add(member)
    await session.flush()
    return member


async def update_member(
    session: AsyncSession,
    member_id: uuid.UUID,
    data: MemberUpdate,
    client_ts: datetime | None = None,
) -> HouseholdMember:
    return await update_record(session, HouseholdMember, member_id, data, client_ts=client_ts)


async def delete_member(
    session: AsyncSession,
    member_id: uuid.UUID,
    client_ts: datetime | None = None,
) -> None:
    await soft_delete(session, HouseholdMember, member_id, client_ts=client_ts)

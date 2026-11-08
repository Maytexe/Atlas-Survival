import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HouseholdMember
from app.schemas import MemberCreate
from app.services.records import now_utc


async def create_member(session: AsyncSession, data: MemberCreate) -> HouseholdMember:
    member = HouseholdMember(
        id=data.id or uuid.uuid4(),
        name=data.name,
        member_type=data.member_type,
        age=data.age,
        notes=data.notes,
        client_updated_at=data.client_updated_at or now_utc(),
    )
    session.add(member)
    await session.flush()
    return member

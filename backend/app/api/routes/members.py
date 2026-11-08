import uuid

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import HouseholdMember
from app.schemas import MemberCreate, MemberRead, MemberUpdate
from app.services import create_member, list_active, soft_delete, update_record

router = APIRouter()


@router.get("/members", response_model=list[MemberRead])
async def get_members(session: ReadSession) -> list[HouseholdMember]:
    return await list_active(session, HouseholdMember)


@router.post(
    "/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_member(data: MemberCreate, session: WriteSession) -> HouseholdMember:
    return await create_member(session, data)


@router.patch("/members/{member_id}", response_model=MemberRead)
async def patch_member(
    member_id: uuid.UUID,
    data: MemberUpdate,
    session: WriteSession,
) -> HouseholdMember:
    return await update_record(session, HouseholdMember, member_id, data)


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(member_id: uuid.UUID, session: WriteSession) -> None:
    await soft_delete(session, HouseholdMember, member_id)

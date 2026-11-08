import uuid
from typing import cast

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import HouseholdMember
from app.schemas import MemberCreate, MemberRead, MemberUpdate
from app.services import list_active
from app.services.registry import ENTITY_OPERATIONS

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
    return cast(
        HouseholdMember,
        await ENTITY_OPERATIONS["household_members"].create(session, data),
    )


@router.patch("/members/{member_id}", response_model=MemberRead)
async def patch_member(
    member_id: uuid.UUID,
    data: MemberUpdate,
    session: WriteSession,
) -> HouseholdMember:
    return cast(
        HouseholdMember,
        await ENTITY_OPERATIONS["household_members"].update(session, member_id, data),
    )


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(member_id: uuid.UUID, session: WriteSession) -> None:
    await ENTITY_OPERATIONS["household_members"].soft_delete(session, member_id)

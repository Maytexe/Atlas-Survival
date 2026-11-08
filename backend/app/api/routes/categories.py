import uuid
from typing import cast

from fastapi import APIRouter, status

from app.api.deps import ReadSession, WriteSession
from app.models import Category
from app.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import list_active
from app.services.registry import ENTITY_OPERATIONS

router = APIRouter()


@router.get("/categories", response_model=list[CategoryRead])
async def get_categories(session: ReadSession) -> list[Category]:
    return await list_active(session, Category)


@router.post(
    "/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_category(data: CategoryCreate, session: WriteSession) -> Category:
    return cast(Category, await ENTITY_OPERATIONS["categories"].create(session, data))


@router.patch("/categories/{category_id}", response_model=CategoryRead)
async def patch_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    session: WriteSession,
) -> Category:
    return cast(
        Category,
        await ENTITY_OPERATIONS["categories"].update(session, category_id, data),
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, session: WriteSession) -> None:
    await ENTITY_OPERATIONS["categories"].soft_delete(session, category_id)

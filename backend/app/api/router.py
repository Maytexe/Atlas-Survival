from fastapi import APIRouter

from app.api.routes import alerts, batches, categories, dashboard, health, inventory, members, sync
from app.schemas import ProblemDetails

router = APIRouter(
    prefix="/api",
    responses={status_code: {"model": ProblemDetails} for status_code in (400, 404, 409, 422, 500)},
)
router.include_router(health.router)
router.include_router(members.router)
router.include_router(categories.router)
router.include_router(inventory.router)
router.include_router(batches.router)
router.include_router(dashboard.router)
router.include_router(alerts.router)
router.include_router(sync.router)

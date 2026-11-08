from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings


def get_today() -> date:
    return datetime.now(ZoneInfo(settings.timezone)).date()

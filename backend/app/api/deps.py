from datetime import date
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import get_today
from app.db.session import get_session
from app.db.writes import get_write_session

ReadSession = Annotated[AsyncSession, Depends(get_session)]
WriteSession = Annotated[AsyncSession, Depends(get_write_session)]
Today = Annotated[date, Depends(get_today)]

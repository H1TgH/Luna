from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.database import Session


class UnitOfWork:
    def __init__(self, session_factory=Session):
        self._session_factory = session_factory

    @asynccontextmanager
    async def __call__(self, session: AsyncSession = None):
        if session is not None:
            yield session
        else:
            async with self._session_factory() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
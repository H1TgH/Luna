import pytest_asyncio
from httpx import AsyncClient

from infrastructure.database.database import Base, engine


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(base_url="http://test_app:8000") as ac:
        yield ac

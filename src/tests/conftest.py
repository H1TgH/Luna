import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from main import app
from infrastructure.database.database import Base, Session
from settings import settings

@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(settings.db.database_url, future=True, echo=False)

    # создаём схему
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with engine.connect() as conn:
        transaction = await conn.begin()
        async with async_session_factory(bind=conn) as session:

            # Подменяем get_db на фикстурную сессию
            async def override_get_db():
                try:
                    yield session
                finally:
                    pass

            app.dependency_overrides[Session] = override_get_db
            try:
                yield session
            finally:
                await transaction.rollback()
                app.dependency_overrides.clear()

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):  # передаём фикстуру сессии
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

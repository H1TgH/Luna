import io
from collections.abc import Callable
from contextlib import asynccontextmanager
from datetime import date, timedelta
from uuid import UUID

import bcrypt
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from core.posts.services import PostService, get_post_service
from core.users.auth.services import AuthService, get_auth_service
from core.users.profile.services import ProfileService, get_profile_service
from infrastructure.database.models.posts import PostModel
from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.models.users import UserModel
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.s3.storage import S3Storage
from main import app
from settings import settings


class TestUnitOfWork:
    def __init__(self, session: AsyncSession):
        self._session = session

    @asynccontextmanager
    async def __call__(self):
        yield self._session
        await self._session.commit()


@pytest.fixture
async def db_session():
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from infrastructure.database.database import Base

    engine = create_async_engine(settings.db.database_url)
    Session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        autoflush=False,
        expire_on_commit=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.connect() as conn:
        async with Session(bind=conn) as session:
            yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
def test_auth_service(db_session: AsyncSession):
    uow = TestUnitOfWork(db_session)
    return AuthService(uow)


@pytest.fixture
def test_profile_service(db_session: AsyncSession):
    uow = TestUnitOfWork(db_session)
    return ProfileService(uow)


@pytest.fixture
async def test_post_service(db_session: AsyncSession):
    uow = TestUnitOfWork(db_session)
    service = PostService(
        uow=uow,
        s3_storage=S3Storage(
            access_key=settings.s3.access_key,
            secret_key=settings.s3.secret_key.get_secret_value(),
            bucket_name="testposts",
            internal_endpoint_url=settings.s3.internal_endpoint,
            public_endpoint_url=settings.s3.public_endpoint
        ),
        image_processor=ImageProcessor()
    )

    async with service.s3.get_internal_client() as client:
        try:
            await client.create_bucket(Bucket="testposts")
        except client.exceptions.BucketAlreadyOwnedByYou:
            pass

    yield service

    async with service.s3.get_internal_client() as client:
        response = await client.list_objects_v2(Bucket="testposts")
        for obj in response.get("Contents", []):
            await client.delete_object(Bucket="testposts", Key=obj["Key"])
        await client.delete_bucket(Bucket="testposts")


@pytest.fixture
async def client(test_auth_service, test_profile_service, test_post_service):
    app.dependency_overrides[get_auth_service] = lambda: test_auth_service
    app.dependency_overrides[get_profile_service] = lambda: test_profile_service
    app.dependency_overrides[get_post_service] = lambda: test_post_service

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def fake_image_bytes():
    img = Image.new("RGB", (10, 10), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture
def user_auth_payload() -> Callable:
    def _payload(**overrides):
        data = {
            "email": "test@example.com",
            "password": "123123123",
        }
        data.update(overrides)
        return data

    return _payload


@pytest.fixture
def profile_payload() -> Callable:
    def _payload(**overrides):
        data = {
            "username": "test",
            "first_name": "test",
            "last_name": "test",
            "birth_date": "2000-01-01",
            "gender": "Male"
        }
        data.update(overrides)
        return data

    return _payload


@pytest.fixture
def user_factory(db_session: AsyncSession) -> Callable:
    async def _create_user(
        email: str = "test@example.com",
        password: str = "123123123"
    ) -> UserModel:
        user = UserModel(
            email=email,
            password=bcrypt.hashpw(password.encode(), bcrypt.gensalt(4)).decode(),
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        return user

    return _create_user


@pytest.fixture
def profile_factory(db_session: AsyncSession) -> Callable:
    async def _create_profile(
        user_id: UUID,
        username: str = "test",
        first_name: str = "test",
        last_name: str = "test",
        birth_date: date = date(2000, 1, 1),
        gender: str = "Male"
    ) -> ProfileModel:
        profile = ProfileModel(
            id=user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            gender=gender
        )

        db_session.add(profile)
        await db_session.commit()
        await db_session.refresh(profile)

        return profile

    return _create_profile


@pytest.fixture
def post_factory(db_session: AsyncSession) -> Callable:
    async def _create_post(
        author_id: UUID,
        content: str | None = "Hello, World!"
    ) -> PostModel:
        post = PostModel(
            author_id=author_id,
            content=content
        )

        db_session.add(post)
        await db_session.commit()
        await db_session.refresh(post)

        return post

    return _create_post


@pytest.fixture
def auth_header_factory(test_auth_service: AuthService) -> Callable:
    def _create_auth_header(user: UserModel) -> dict[str, str]:
        token = test_auth_service.create_token(
            {"sub": str(user.id), "type": "access"},
            expires_delta=timedelta(settings.security.access_ttl),
        )

        return {"Authorization": token}

    return _create_auth_header


@pytest.fixture
async def test_user(db_session: AsyncSession, user_factory: Callable) -> UserModel:
    return await user_factory()


@pytest.fixture
async def test_profile(test_user: UserModel, db_session: AsyncSession, profile_factory: Callable) -> ProfileModel:
    return await profile_factory(test_user.id)


@pytest.fixture
def auth_header(test_user: UserModel, auth_header_factory) -> dict[str, str]:
    return auth_header_factory(test_user)

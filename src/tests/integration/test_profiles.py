from collections.abc import Callable
from http import HTTPStatus

import pytest
from httpx import AsyncClient

from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.models.users import UserModel


@pytest.mark.asyncio
async def test_create_profile(client, profile_payload, auth_header):
    response = await client.post("/api/v1/user/profile", json=profile_payload(), headers=auth_header)

    assert response.status_code == HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_profile_unauthorized(client, profile_payload):
    response = await client.post("/api/v1/user/profile", json=profile_payload())

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_create_existing_profile(client, profile_payload, test_profile, auth_header):
    response = await client.post("/api/v1/user/profile", json=profile_payload(), headers=auth_header)

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_create_profile_with_existing_username(
    client,
    profile_payload,
    test_user,
    test_profile,
    auth_header_factory,
    user_factory,
    profile_factory
):
    user = await user_factory(email="test1@example.com")

    response = await client.post("/api/v1/user/profile", json=profile_payload(), headers=auth_header_factory(user))

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.parametrize("field", [
    "username",
    "first_name",
    "last_name",
    "birth_date",
    "gender"
])
@pytest.mark.asyncio
async def test_create_profile_missing_required_fields(client, profile_payload, auth_header, field):
    payload = profile_payload()
    payload.pop(field)

    response = await client.post("/api/v1/user/profile", json=payload, headers=auth_header)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_create_profile_with_invalid_birth_date(client, profile_payload, auth_header):
    payload = profile_payload(birth_date="01/01/2000")

    response = await client.post("/api/v1/user/profile", json=payload, headers=auth_header)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_create_profile_with_invalid_gender(client, profile_payload, auth_header):
    payload = profile_payload(gender="gender")

    response = await client.post("/api/v1/user/profile", json=payload, headers=auth_header)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_get_my_profile(client, test_profile, auth_header):
    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_get_my_profile_avatar_url_is_none_by_default(client, test_profile, auth_header):
    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["avatar_url"] is None


@pytest.mark.asyncio
async def test_get_my_profile_not_found(client, auth_header):
    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_get_my_profile_unauthorized(client):
    response = await client.get("/api/v1/user/profile/me")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_profile(client, user_factory, profile_factory, auth_header):
    user = await user_factory(email="test1@example.com")
    await profile_factory(user_id=user.id, username="testusername")

    response = await client.get("/api/v1/user/profile/testusername", headers=auth_header)

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_get_profile_not_found(client, user_factory, profile_factory, auth_header):
    user = await user_factory(email="test1@example.com")
    await profile_factory(user_id=user.id, username="testun")

    response = await client.get("/api/v1/user/profile/testusername", headers=auth_header)

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_get_profile_unauthorized(client):
    response = await client.get("/api/v1/user/profile/testusername")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_update_profile(client, test_profile, auth_header):
    payload = {"first_name": "new_name"}

    response = await client.patch("/api/v1/user/profile/me", json=payload, headers=auth_header)

    assert response.status_code == HTTPStatus.NO_CONTENT


@pytest.mark.asyncio
async def test_update_profile_not_found(client, profile_payload, auth_header):
    response = await client.patch("/api/v1/user/profile/me", json=profile_payload(), headers=auth_header)

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_update_profile_unauthorized(client, profile_payload):
    response = await client.patch("/api/v1/user/profile/me", json=profile_payload())

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_update_profile_empty_payload(client, test_profile, auth_header):
    response = await client.patch("/api/v1/user/profile/me", json={}, headers=auth_header)

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_upload_avatar(client, test_profile, auth_header, fake_image_bytes):
    response = await client.post(
        "/api/v1/user/profile/me/avatar",
        files={"avatar": ("avatar.jpg", fake_image_bytes, "image/jpeg")},
        headers=auth_header
    )

    assert response.status_code == HTTPStatus.NO_CONTENT


@pytest.mark.asyncio
async def test_upload_avatar_sets_url(client, test_profile, auth_header, fake_image_bytes):
    await client.post(
        "/api/v1/user/profile/me/avatar",
        files={"avatar": ("avatar.jpg", fake_image_bytes, "image/jpeg")},
        headers=auth_header
    )

    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["avatar_url"] is not None


@pytest.mark.asyncio
async def test_upload_avatar_no_profile(client, auth_header, fake_image_bytes):
    response = await client.post(
        "/api/v1/user/profile/me/avatar",
        files={"avatar": ("avatar.jpg", fake_image_bytes, "image/jpeg")},
        headers=auth_header
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_upload_avatar_unauthorized(client, test_profile, fake_image_bytes):
    response = await client.post(
        "/api/v1/user/profile/me/avatar",
        files={"avatar": ("avatar.jpg", fake_image_bytes, "image/jpeg")}
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_search_profiles_by_username(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    user: UserModel = await user_factory(email="alice@example.com")
    await profile_factory(user_id=user.id, username="alicewonder", first_name="Alice", last_name="Wonder")

    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "alicewonder"},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    usernames = [p["username"] for p in response.json()]
    assert "alicewonder" in usernames


@pytest.mark.asyncio
async def test_search_profiles_by_first_name(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    user: UserModel = await user_factory(email="bob@example.com")
    await profile_factory(user_id=user.id, username="bobsmith", first_name="Robert", last_name="Smith")

    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Robert"},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    first_names = [p["first_name"] for p in response.json()]
    assert "Robert" in first_names


@pytest.mark.asyncio
async def test_search_profiles_by_last_name(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    user: UserModel = await user_factory(email="charlie@example.com")
    await profile_factory(user_id=user.id, username="charliex", first_name="Charlie", last_name="Johnson")

    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Johnson"},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    last_names = [p["last_name"] for p in response.json()]
    assert "Johnson" in last_names


@pytest.mark.asyncio
async def test_search_profiles_no_results(
    client: AsyncClient,
    auth_header: dict[str, str],
):
    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "zzznomatch999"},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json() == []


@pytest.mark.asyncio
async def test_search_profiles_returns_list(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    for i in range(3):
        user: UserModel = await user_factory(email=f"user{i}@example.com")
        await profile_factory(user_id=user.id, username=f"searchuser{i}", first_name="Search", last_name=f"User{i}")

    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Search"},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    assert len(response.json()) >= 3


@pytest.mark.asyncio
async def test_search_profiles_respects_limit(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    for i in range(5):
        user: UserModel = await user_factory(email=f"limituser{i}@example.com")
        await profile_factory(
            user_id=user.id,
            username=f"limituser{i}",
            first_name="Limit",
            last_name=f"User{i}",
        )

    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Limit", "limit": 2},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    assert len(response.json()) <= 2


@pytest.mark.asyncio
async def test_search_profiles_respects_offset(
    client: AsyncClient,
    user_factory: Callable[..., UserModel],
    profile_factory: Callable[..., ProfileModel],
    auth_header: dict[str, str],
):
    for i in range(4):
        user: UserModel = await user_factory(email=f"offsetuser{i}@example.com")
        await profile_factory(
            user_id=user.id,
            username=f"offsetuser{i}",
            first_name="Offset",
            last_name=f"User{i}",
        )

    all_response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Offset", "limit": 30, "offset": 0},
        headers=auth_header,
    )
    offset_response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "Offset", "limit": 30, "offset": 2},
        headers=auth_header,
    )

    assert all_response.status_code == HTTPStatus.OK
    assert offset_response.status_code == HTTPStatus.OK
    assert len(offset_response.json()) < len(all_response.json())


@pytest.mark.asyncio
async def test_search_profiles_unauthorized(client: AsyncClient):
    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "test"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_search_profiles_missing_query(
    client: AsyncClient,
    auth_header: dict[str, str],
):
    response = await client.get(
        "/api/v1/user/profile/search",
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_search_profiles_query_too_long(
    client: AsyncClient,
    auth_header: dict[str, str],
):
    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": "a" * 51},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_search_profiles_response_schema(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
):
    response = await client.get(
        "/api/v1/user/profile/search",
        params={"query": test_profile.username},
        headers=auth_header,
    )

    assert response.status_code == HTTPStatus.OK
    results = response.json()
    assert len(results) >= 1

    profile = results[0]
    assert "id" in profile
    assert "username" in profile
    assert "first_name" in profile
    assert "last_name" in profile
    assert "gender" in profile
    assert "birth_date" in profile
    assert "avatar_url" in profile
    assert "status" in profile

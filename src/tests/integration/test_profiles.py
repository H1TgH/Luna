import http

import pytest


@pytest.mark.asyncio
async def test_create_profile(client, profile_payload, auth_header):
    response = await client.post("/api/v1/user/profile", json=profile_payload(), headers=auth_header)

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_profile_unauthorized(client, profile_payload):
    response = await client.post("/api/v1/user/profile", json=profile_payload())

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_create_existing_profile(client, profile_payload, test_profile, auth_header):
    response = await client.post("/api/v1/user/profile", json=profile_payload(), headers=auth_header)

    assert response.status_code == http.HTTPStatus.BAD_REQUEST


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

    assert response.status_code == http.HTTPStatus.BAD_REQUEST


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

    assert response.status_code == http.HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_create_profile_with_invalid_birth_date(client, profile_payload, auth_header):
    payload = profile_payload(birth_date="01/01/2000")

    response = await client.post("/api/v1/user/profile", json=payload, headers=auth_header)

    assert response.status_code == http.HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_create_profile_with_invalid_gender(client, profile_payload, auth_header):
    payload = profile_payload(gender="gender")

    response = await client.post("/api/v1/user/profile", json=payload, headers=auth_header)

    assert response.status_code == http.HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_get_my_profile(client, test_profile, auth_header):
    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_get_my_profile_not_found(client, auth_header):
    response = await client.get("/api/v1/user/profile/me", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_get_my_profile_unauthorized(client):
    response = await client.get("/api/v1/user/profile/me")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_profile(client, user_factory, profile_factory, auth_header):
    user = await user_factory(email="test1@example.com")
    await profile_factory(user_id=user.id, username="testusername")

    response = await client.get("/api/v1/user/profile/testusername", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_get_profile_not_found(client, user_factory, profile_factory, auth_header):
    user = await user_factory(email="test1@example.com")
    await profile_factory(user_id=user.id, username="testun")

    response = await client.get("/api/v1/user/profile/testusername", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_get_profile_unauthorized(client):
    response = await client.get("/api/v1/user/profile/testusername")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_update_profile(client, test_profile, auth_header):
    payload = {"first_name": "new_name"}

    response = await client.patch("/api/v1/user/profile/me", json=payload, headers=auth_header)

    assert response.status_code == http.HTTPStatus.NO_CONTENT


@pytest.mark.asyncio
async def test_update_profile_not_found(client, profile_payload, auth_header):
    response = await client.patch("/api/v1/user/profile/me", json=profile_payload(), headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_update_profile_unauthorized(client, profile_payload):
    response = await client.patch("/api/v1/user/profile/me", json=profile_payload())

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_update_profile_empty_payload(client, test_profile, auth_header):
    response = await client.patch("/api/v1/user/profile/me", json={}, headers=auth_header)

    assert response.status_code == http.HTTPStatus.BAD_REQUEST

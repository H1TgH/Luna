import http
import io
from collections.abc import Callable
from uuid import uuid4

import pytest
from httpx import AsyncClient, Response
from PIL import Image

from infrastructure.database.models.posts import PostModel
from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.models.users import UserModel


@pytest.fixture
def fake_image_bytes() -> bytes:
    img = Image.new("RGB", (10, 10), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_create_post_with_content(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.post(
        "/api/v1/posts/",
        data={"content": "Hello world"},
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_post_with_image(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    fake_image_bytes: bytes
):
    response: Response = await client.post(
        "/api/v1/posts/",
        files={"images": ("photo.jpg", fake_image_bytes, "image/jpeg")},
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_post_with_content_and_images(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    fake_image_bytes: bytes
):
    response: Response = await client.post(
        "/api/v1/posts/",
        data={"content": "Post with images"},
        files={"images": ("photo.jpg", fake_image_bytes, "image/jpeg")},
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_post_with_multiple_images(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    fake_image_bytes: bytes
):
    images = [
        ("images", (f"photo{i}.jpg", fake_image_bytes, "image/jpeg"))
        for i in range(5)
    ]

    response: Response = await client.post(
        "/api/v1/posts/",
        files=images,
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_post_with_max_images(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    fake_image_bytes: bytes
):
    images = [
        ("images", (f"photo{i}.jpg", fake_image_bytes, "image/jpeg"))
        for i in range(10)
    ]

    response: Response = await client.post(
        "/api/v1/posts/",
        files=images,
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.CREATED


@pytest.mark.asyncio
async def test_create_post_with_too_many_images(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    fake_image_bytes: bytes
):
    images = [
        ("images", (f"photo{i}.jpg", fake_image_bytes, "image/jpeg"))
        for i in range(11)
    ]

    response: Response = await client.post(
        "/api/v1/posts/",
        files=images,
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_create_post_without_content_and_images(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.post(
        "/api/v1/posts/",
        headers=auth_header
    )

    assert response.status_code == http.HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_create_post_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel
):
    response: Response = await client.post(
        "/api/v1/posts/",
        data={"content": "Hello world"}
    )

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_post(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.get(f"/api/v1/posts/{post.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["id"] == str(post.id)
    assert response.json()["author_id"] == str(test_profile.id)
    assert response.json()["content"] == post.content


@pytest.mark.asyncio
async def test_get_post_likes_count_initial(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.get(f"/api/v1/posts/{post.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["likes_count"] == 0
    assert response.json()["is_current_user_likes"] is False


@pytest.mark.asyncio
async def test_get_post_is_current_user_likes_true(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)
    await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    response: Response = await client.get(f"/api/v1/posts/{post.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["likes_count"] == 1
    assert response.json()["is_current_user_likes"] is True


@pytest.mark.asyncio
async def test_get_post_not_found(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.get(f"/api/v1/posts/{uuid4()}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_get_post_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.get(f"/api/v1/posts/{post.id}")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_my_posts_empty(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.get("/api/v1/posts/me", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["posts"] == []
    assert response.json()["has_next"] is False
    assert response.json()["next_cursor"] is None


@pytest.mark.asyncio
async def test_get_my_posts(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    await post_factory(author_id=test_profile.id)
    await post_factory(author_id=test_profile.id)

    response: Response = await client.get("/api/v1/posts/me", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert len(response.json()["posts"]) == 2


@pytest.mark.asyncio
async def test_get_my_posts_pagination(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    for _ in range(3):
        await post_factory(author_id=test_profile.id)

    response: Response = await client.get("/api/v1/posts/me", params={"limit": 2}, headers=auth_header)

    data = response.json()
    assert response.status_code == http.HTTPStatus.OK
    assert len(data["posts"]) == 2
    assert data["has_next"] is True
    assert data["next_cursor"] is not None


@pytest.mark.asyncio
async def test_get_my_posts_unauthorized(client: AsyncClient):
    response: Response = await client.get("/api/v1/posts/me")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_user_posts(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    user_factory: Callable,
    profile_factory: Callable,
    post_factory: Callable
):
    other_user: UserModel = await user_factory(email="other@example.com")
    other_profile: ProfileModel = await profile_factory(user_id=other_user.id, username="other")
    await post_factory(author_id=other_profile.id)
    await post_factory(author_id=other_profile.id)

    response: Response = await client.get(f"/api/v1/posts/user/{other_profile.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert len(response.json()["posts"]) == 2


@pytest.mark.asyncio
async def test_get_user_posts_empty(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str],
    user_factory: Callable,
    profile_factory: Callable
):
    other_user: UserModel = await user_factory(email="other@example.com")
    other_profile: ProfileModel = await profile_factory(user_id=other_user.id, username="other")

    response: Response = await client.get(f"/api/v1/posts/user/{other_profile.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["posts"] == []


@pytest.mark.asyncio
async def test_get_user_posts_does_not_return_other_users_posts(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str],
    user_factory: Callable,
    profile_factory: Callable
):
    other_user: UserModel = await user_factory(email="other@example.com")
    other_profile: ProfileModel = await profile_factory(user_id=other_user.id, username="other")
    await post_factory(author_id=test_profile.id)
    await post_factory(author_id=other_profile.id)

    response: Response = await client.get(f"/api/v1/posts/user/{other_profile.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK
    assert len(response.json()["posts"]) == 1


@pytest.mark.asyncio
async def test_get_user_posts_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel
):
    response: Response = await client.get(f"/api/v1/posts/user/{test_profile.id}")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_delete_post(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NO_CONTENT


@pytest.mark.asyncio
async def test_delete_post_not_found(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.delete(f"/api/v1/posts/{uuid4()}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_delete_post_forbidden(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str],
    user_factory: Callable,
    profile_factory: Callable
):
    other_user: UserModel = await user_factory(email="other@example.com")
    other_profile: ProfileModel = await profile_factory(user_id=other_user.id, username="other")
    post: PostModel = await post_factory(author_id=other_profile.id)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}", headers=auth_header)

    assert response.status_code == http.HTTPStatus.FORBIDDEN


@pytest.mark.asyncio
async def test_delete_post_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_put_like(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_put_like_not_found(
    client: AsyncClient,
    test_profile: ProfileModel,
    auth_header: dict[str, str]
):
    response: Response = await client.post(f"/api/v1/posts/{uuid4()}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_put_like_idempotent(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)
    response: Response = await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_put_like_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.post(f"/api/v1/posts/{post.id}/like")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_remove_like(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)
    await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_remove_like_not_found(client: AsyncClient, test_profile: ProfileModel, auth_header: dict[str, str]):
    response: Response = await client.delete(f"/api/v1/posts/{uuid4()}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_remove_like_idempotent(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    assert response.status_code == http.HTTPStatus.OK


@pytest.mark.asyncio
async def test_remove_like_unauthorized(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable
):
    post: PostModel = await post_factory(author_id=test_profile.id)

    response: Response = await client.delete(f"/api/v1/posts/{post.id}/like")

    assert response.status_code == http.HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_likes_count_initial(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    await post_factory(author_id=test_profile.id)

    response: Response = await client.get("/api/v1/posts/me", headers=auth_header)

    post = response.json()["posts"][0]
    assert post["likes_count"] == 0
    assert post["is_current_user_likes"] is False


@pytest.mark.asyncio
async def test_is_current_user_likes_true(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)
    await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    response: Response = await client.get("/api/v1/posts/me", headers=auth_header)

    post_data = response.json()["posts"][0]
    assert post_data["likes_count"] == 1
    assert post_data["is_current_user_likes"] is True


@pytest.mark.asyncio
async def test_is_current_user_likes_false_after_remove(
    client: AsyncClient,
    test_profile: ProfileModel,
    post_factory: Callable,
    auth_header: dict[str, str]
):
    post: PostModel = await post_factory(author_id=test_profile.id)
    await client.post(f"/api/v1/posts/{post.id}/like", headers=auth_header)
    await client.delete(f"/api/v1/posts/{post.id}/like", headers=auth_header)

    response: Response = await client.get("/api/v1/posts/me", headers=auth_header)

    post_data = response.json()["posts"][0]
    assert post_data["likes_count"] == 0
    assert post_data["is_current_user_likes"] is False

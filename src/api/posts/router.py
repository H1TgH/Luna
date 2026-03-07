from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, Query

from core.posts.entities import PostCreationDTO, UploadImageDTO
from core.posts.services import PostService, get_post_service
from core.users.auth.entities import CurrentUserDTO
from dependencies import get_current_user
from api.posts.schemas import PostPageSchema


posts_router = APIRouter(
    prefix="/posts",
    tags=["posts"]
)


@posts_router.post(
    "/",
    status_code=201
)
async def create_post(
    content: str | None = Form(None),
    images: list[UploadFile] | None = File(None),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    post_dto = PostCreationDTO(content)
    images_dto = []
    if images:
        for image in images:
            images_dto.append(UploadImageDTO(
                file_name=image.filename,
                data=image.file,
                content_type=image.content_type
            ))

    await service.create(
        post_data=post_dto,
        author_id=current_user.id,
        images=images_dto
    )


@posts_router.get(
    "/me",
    status_code=200,
    response_model=PostPageSchema
)
async def get_user_posts(
    limit: int = Query(25, ge=1, le=50),
    cursor: datetime | None = Query(None),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    result = await service.get_user_posts(
        profile_id=current_user.id,
        current_user_id=current_user.id,
        cursor=cursor,
        limit=limit
    )

    return result


@posts_router.get(
    "/{profile_id}",
    status_code=200,
    response_model=PostPageSchema
)
async def get_user_posts(
    profile_id: UUID,
    limit: int = Query(25, ge=1, le=50),
    cursor: datetime | None = Query(None),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    result = await service.get_user_posts(
        profile_id=profile_id,
        current_user_id=current_user.id,
        cursor=cursor,
        limit=limit
    )

    return result


@posts_router.delete(
    "/{post_id}",
    status_code=204
)
async def delete_post(
    post_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    await service.delete(post_id, current_user.id)


@posts_router.post(
    "/{post_id}/like",
    status_code=200
)
async def put_like(
    post_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    await service.put_like(post_id, current_user.id)


@posts_router.delete(
    "/{post_id}/like",
    status_code=200
)
async def remove_like(
    post_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: PostService = Depends(get_post_service)
):
    await service.remove_like(post_id, current_user.id)

import asyncio
from datetime import datetime
from uuid import UUID, uuid4

from core.exceptions import PermissionDeniedException
from core.posts.entities import PostCreationDTO, PostImageDTO, PostReadDTO, PostsPageDTO, UploadImageDTO
from core.posts.exceptions import EmptyPostException, PostDoesNotExistException, UnacceptableImageCountException
from infrastructure.database.repositories.posts.posts import PostRepository
from infrastructure.database.uow import UnitOfWork
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.s3.storage import S3Storage
from settings import settings


class PostService:
    def __init__(self, uow: UnitOfWork, s3_storage: S3Storage, image_processor: ImageProcessor):
        self.uow = uow
        self.s3 = s3_storage
        self.image_processor = image_processor

    async def create(
        self,
        post_data: PostCreationDTO,
        author_id: UUID,
        images: list[UploadImageDTO] | None = None
    ) -> None:
        if not post_data.content and not images:
            raise EmptyPostException("Post must have content or at least one image")

        async with self.uow() as session:
            repository = PostRepository(session)

            if images and len(images) > 10:
                raise UnacceptableImageCountException("You can only add 10 images")

            converted_images = []
            if images:
                upload_tasks = []
                for index, image in enumerate(images):
                    converted_image = await asyncio.to_thread(
                        self.image_processor.convert_to_webp,
                        image.data
                    )
                    file_name = str(uuid4()) + ".webp"
                    content_type = "image/webp"

                    upload_tasks.append(
                        self.s3.upload(
                            object_name=file_name,
                            body=converted_image,
                            content_type=content_type
                        )
                    )

                    converted_images.append(PostImageDTO(object_key=file_name, order=index + 1))

                await asyncio.gather(*upload_tasks)

            await repository.add(author_id, post_data, converted_images)

    async def get_user_posts(
        self,
        profile_id: UUID,
        current_user_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25
    ) -> PostsPageDTO:
        async with self.uow() as session:
            repository = PostRepository(session)

            posts = await repository.get_user_posts(profile_id, current_user_id, cursor, limit + 1)

            has_next = len(posts) > limit
            posts = posts[:limit]
            next_cursor = posts[-1].created_at if posts else None

            post_dtos = []
            for post in posts:
                images = []
                for image in post.images:
                    url = f"{self.s3.public_endpoint}/{self.s3.bucket_name}/{image.object_key}"
                    images.append(PostImageDTO(object_key=url, order=image.order))

                post_dtos.append(
                    PostReadDTO(
                        id=post.id,
                        author_id=post.author_id,
                        content=post.content,
                        images=images,
                        created_at=post.created_at,
                        likes_count=post.likes_count,
                        is_current_user_likes=post.is_current_user_likes
                    )
                )

            return PostsPageDTO(
                posts=post_dtos,
                has_next=has_next,
                next_cursor=next_cursor
            )

    async def put_like(self, post_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)

            post = await repository.get_post_or_none(post_id)
            if post is None:
                raise PostDoesNotExistException("Post does not exist")

            if not await repository.is_put_like(post_id, current_user_id):
                await repository.add_like(post_id, current_user_id)

    async def remove_like(self, post_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)

            post = await repository.get_post_or_none(post_id)
            if post is None:
                raise PostDoesNotExistException("Post does not exis")
            if await repository.is_put_like(post_id, current_user_id):
                await repository.delete_like(post_id, current_user_id)

    async def delete(self, post_id: UUID, current_user_id) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)

            post = await repository.get_post_or_none(post_id)
            if post is None:
                raise PostDoesNotExistException("Post does not exist")
            if post.author_id != current_user_id:
                raise PermissionDeniedException("You are not allowed to delete this post")

            delete_tasks = []
            for image in post.images:
                delete_tasks.append(
                    self.s3.delete(image.object_key)
                )
            await asyncio.gather(*delete_tasks)

            await repository.delete(post_id)


def get_post_service() -> PostService:
    return PostService(
        uow=UnitOfWork(),
        s3_storage=S3Storage(
            access_key=settings.s3.access_key,
            secret_key=settings.s3.secret_key.get_secret_value(),
            bucket_name="posts",
            internal_endpoint_url=settings.s3.internal_endpoint,
            public_endpoint_url=settings.s3.public_endpoint
        ),
        image_processor=ImageProcessor()
    )

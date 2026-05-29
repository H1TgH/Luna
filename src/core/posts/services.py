import asyncio
from datetime import datetime
from uuid import UUID, uuid4

from core.exceptions import PermissionDeniedException
from core.posts.entities import (
    CommentCreationDTO,
    CommentListItemDTO,
    CommentsPageDTO,
    CommentsReplyPageDTO,
    ImageDTO,
    PostCreationDTO,
    PostImageDTO,
    PostReadDTO,
    PostsPageDTO,
    UploadImageDTO,
    CommentAuthorDTO,
    CommentReadDTO,
)
from core.posts.exceptions import (
    CommentDoesNotExistException,
    EmptyPostException,
    InvalidCommentParentException,
    PostDoesNotExistException,
    UnacceptableImageCountException,
)
from infrastructure.database.repositories.posts import PostRepository
from infrastructure.database.repositories.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.s3.storage import S3Storage
from settings import settings


MAX_IMAGES_PER_POST = 10


class PostService:
    def __init__(self, uow: UnitOfWork, s3_storage: S3Storage, image_processor: ImageProcessor):
        self.uow = uow
        self.s3 = s3_storage
        self.image_processor = image_processor

    async def add_post(
        self,
        post_data: PostCreationDTO,
        author_id: UUID,
        images: list[UploadImageDTO] | None = None,
    ) -> PostReadDTO:
        self._validate_post(post_data, images)

        image_dtos = await self._process_and_upload_images(images) if images else []

        async with self.uow() as session:
            repository = PostRepository(session)
            result = await repository.add_post(author_id, post_data, image_dtos)

        result.images = self._resolve_image_urls(result.images)
        return result

    async def get_post_by_id(self, post_id: UUID, current_user_id: UUID) -> PostReadDTO:
        async with self.uow() as session:
            repository = PostRepository(session)
            post = await repository.get_by_id(post_id, current_user_id)

        if post is None:
            raise PostDoesNotExistException("Post does not exist")

        post.images = self._resolve_image_urls(post.images)
        return post

    async def get_user_posts(
        self,
        profile_id: UUID,
        current_user_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25,
    ) -> PostsPageDTO:
        async with self.uow() as session:
            repository = PostRepository(session)
            posts = await repository.get_user_posts(profile_id, current_user_id, cursor, limit + 1)

        has_next = len(posts) > limit
        posts = posts[:limit]
        next_cursor = posts[-1].created_at if posts else None

        for post in posts:
            post.images = self._resolve_image_urls(post.images)

        return PostsPageDTO(posts=posts, has_next=has_next, next_cursor=next_cursor)

    async def get_images(
        self,
        profile_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25,
    ) -> list[ImageDTO]:
        async with self.uow() as session:
            repository = PostRepository(session)
            images = await repository.get_images(profile_id=profile_id, cursor=cursor, limit=limit)

        for image in images:
            image.object_key = self.s3.get_file_url(image.object_key)

        return images

    async def put_like(self, post_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)
            await self._ensure_post_exists(repository, post_id)

            if not await repository.is_put_like(post_id, current_user_id):
                await repository.add_like(post_id, current_user_id)

    async def remove_like(self, post_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)
            await self._ensure_post_exists(repository, post_id)

            if await repository.is_put_like(post_id, current_user_id):
                await repository.delete_like(post_id, current_user_id)

    async def delete_post(self, post_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)
            post = await self._ensure_post_exists(repository, post_id)
            if post.author_id != current_user_id:
                raise PermissionDeniedException("You are not allowed to delete this post")

            await self._delete_post_images(post.images)
            await repository.delete(post_id)

    async def create_comment(self, data: CommentCreationDTO) -> CommentListItemDTO:
        async with self.uow() as session:
            post_repository = PostRepository(session)
            profile_repository = ProfileRepository(session)

            post = await post_repository.get_post_or_none(data.post_id)
            if not post:
                raise PostDoesNotExistException

            root_comment_id = None
            if data.parent_id:
                parent = await post_repository.get_comment_or_none(data.parent_id)
                if not parent or parent.post_id != data.post_id:
                    raise InvalidCommentParentException

                root_comment_id = (
                    parent.id if parent.parent_id is None
                    else parent.root_comment_id
                )

            comment = await post_repository.create_comment(data, root_comment_id)
            if root_comment_id is not None:
                await post_repository.update_thread_replies_count(root_comment_id, 1)

            author = await profile_repository.get_by_user_id(data.author_id)
            author_dto = CommentAuthorDTO(
                author_id=author.id,
                username=author.username,
                first_name=author.first_name,
                last_name=author.last_name,
                avatar_url=f"{self.s3.public_endpoint}/media/avatars/{author.avatar_key}"
            )

            return CommentListItemDTO(
                id=comment.id,
                post_id=comment.post_id,
                author=author_dto,
                parent_id=comment.parent_id,
                text=comment.text,
                created_at=comment.created_at,
                reply_count=0,
                has_replies=False
            )

    async def get_root_comments(
        self,
        post_id: UUID,
        limit: int = 15,
        cursor: datetime | None = None
    ) -> CommentsPageDTO:
        async with self.uow() as session:
            repository = PostRepository(session)
            comments = await repository.get_root_comments(post_id, limit + 1, cursor)

            has_next = len(comments) > limit
            comments = comments[:limit]
            next_cursor = comments[-1].created_at if comments else None

            for comment in comments:
                comment.author.avatar_url = f"{self.s3.public_endpoint}/media/avatars/{comment.author.avatar_url}"

            return CommentsPageDTO(comments, next_cursor, has_next)

    async def get_comment_thread(
        self,
        comment_id: UUID,
        limit: int = 10,
        cursor: datetime | None = None
    ) -> list[CommentListItemDTO]:
        async with self.uow() as session:
            repository = PostRepository(session)
            comments = await repository.get_comment_thread(comment_id, limit + 1, cursor)

            has_next = len(comments) > limit
            comments = comments[:limit]
            next_cursor = comments[-1].created_at if comments else None

            for comment in comments:
                comment.author.avatar_url = f"{self.s3.public_endpoint}/media/avatars/{comment.author.avatar_url}"

            return CommentsReplyPageDTO(comments, next_cursor, has_next)

    async def delete_comment(self, comment_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repository = PostRepository(session)
            comment = await self._ensure_comment_exists(repository, comment_id)
            if comment.author_id != current_user_id:
                raise PermissionDeniedException("You are not allowed to delete this comment")
            await repository.delete_comment(comment_id)

    def _validate_post(self, post_data: PostCreationDTO, images: list[UploadImageDTO] | None) -> None:
        if not post_data.content and not images:
            raise EmptyPostException("Post must have content or at least one image")

        if images and len(images) > MAX_IMAGES_PER_POST:
            raise UnacceptableImageCountException(f"You can only add {MAX_IMAGES_PER_POST} images")

    async def _process_and_upload_images(self, images: list[UploadImageDTO]) -> list[PostImageDTO]:
        upload_tasks = []
        image_dtos = []

        for index, image in enumerate(images):
            converted = await asyncio.to_thread(self.image_processor.convert_to_webp, image.data)
            file_name = f"{uuid4()}.webp"
            upload_tasks.append(self.s3.upload(object_name=file_name, body=converted, content_type="image/webp"))
            image_dtos.append(PostImageDTO(object_key=file_name, order=index + 1))

        await asyncio.gather(*upload_tasks)
        return image_dtos

    def _resolve_image_urls(self, images: list[PostImageDTO] | None) -> list[PostImageDTO]:
        if not images:
            return []
        return [PostImageDTO(object_key=self.s3.get_file_url(img.object_key), order=img.order) for img in images]

    async def _delete_post_images(self, images: list[PostImageDTO]) -> None:
        if not images:
            return
        await asyncio.gather(*[self.s3.delete(image.object_key) for image in images])

    @staticmethod
    async def _ensure_post_exists(repository: PostRepository, post_id: UUID):
        post = await repository.get_post_or_none(post_id)
        if post is None:
            raise PostDoesNotExistException("Post does not exist")
        return post

    @staticmethod
    async def _ensure_comment_exists(repository: PostRepository, comment_id: UUID) -> CommentReadDTO:
        comment = await repository.get_comment_or_none(comment_id)
        if comment is None:
            raise CommentDoesNotExistException("Comment does not exist")
        return comment

    def _build_avatar_url(self, avatar_key: str | None) -> str | None:  # Метод из ProfileService, в дальнейшем вынести в отдельный класс  # noqa: E501
        if not avatar_key:
            return None
        return self.s3.get_file_url(avatar_key)


def get_post_service() -> PostService:
    return PostService(
        uow=UnitOfWork(),
        s3_storage=S3Storage(
            access_key=settings.s3.access_key,
            secret_key=settings.s3.secret_key.get_secret_value(),
            bucket_name="posts",
            internal_endpoint_url=settings.s3.internal_endpoint,
            public_endpoint_url=settings.s3.public_endpoint,
        ),
        image_processor=ImageProcessor(),
    )

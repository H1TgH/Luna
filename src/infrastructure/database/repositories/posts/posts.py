from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.posts.entities import ImageDTO, PostCreationDTO, PostImageDTO, PostReadDTO
from infrastructure.database.models.posts import PostImageModel, PostLikeModel, PostModel


class PostRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(
        self,
        author_id: UUID,
        post_data: PostCreationDTO,
        images: list[PostImageDTO] | None = None
    ) -> PostReadDTO:
        post = PostModel(
            author_id=author_id,
            content=post_data.content
        )
        self.session.add(post)
        await self.session.flush()

        images_dto = []
        if images:
            for image in images:
                image_model = PostImageModel(
                    post_id=post.id,
                    object_key=image.object_key,
                    order=image.order
                )
                self.session.add(image_model)
                self.session.flush(image_model)
                images_dto.append(
                    PostImageDTO(
                        object_key=image_model.object_key,
                        order=image_model.order
                    )
                )

        return PostReadDTO(
            id=post.id,
            author_id=author_id,
            created_at=post.created_at,
            likes_count=0,
            is_current_user_likes=False,
            content=post.content,
            images=images_dto
        )

    async def get_user_posts(
        self,
        profile_id: UUID,
        current_user_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25
    ) -> list[PostReadDTO]:
        stmt = select(PostModel).where(PostModel.author_id == profile_id)
        if cursor is not None:
            stmt = stmt.where(PostModel.created_at < cursor)
        stmt = (
            stmt
            .options(selectinload(PostModel.images))
            .order_by(PostModel.created_at.desc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        posts = result.scalars().all()

        if not posts:
            return []

        post_ids = [p.id for p in posts]

        likes_stmt = (
            select(PostLikeModel.post_id, func.count(PostLikeModel.user_id))
            .where(PostLikeModel.post_id.in_(post_ids))
            .group_by(PostLikeModel.post_id)
        )
        likes_result = await self.session.execute(likes_stmt)
        likes_count_map = dict(likes_result.all())

        user_likes_stmt = (
            select(PostLikeModel.post_id)
            .where(
                PostLikeModel.post_id.in_(post_ids),
                PostLikeModel.user_id == current_user_id
            )
        )
        user_likes_result = await self.session.execute(user_likes_stmt)
        user_liked_post_ids = {row[0] for row in user_likes_result.all()}

        post_dtos = []
        for post in posts:
            post_dtos.append(
                PostReadDTO(
                    id=post.id,
                    author_id=post.author_id,
                    content=post.content,
                    images=[PostImageDTO(object_key=image.object_key, order=image.order) for image in post.images],
                    created_at=post.created_at,
                    likes_count=likes_count_map.get(post.id, 0),
                    is_current_user_likes=post.id in user_liked_post_ids
                )
            )

        return post_dtos

    async def get_by_id(
        self,
        post_id: UUID,
        current_user_id: UUID
    ) -> PostReadDTO:
        stmt = (
            select(PostModel)
            .where(PostModel.id == post_id)
            .options(selectinload(PostModel.images))
        )
        result = await self.session.execute(stmt)
        post = result.scalar_one_or_none()

        if post is None:
            return None

        likes_stmt = (
            select(func.count(PostLikeModel.user_id))
            .where(PostLikeModel.post_id == post_id)
        )
        likes_result = await self.session.execute(likes_stmt)
        likes_count = likes_result.scalar() or 0

        user_like_stmt = select(PostLikeModel).where(
            PostLikeModel.post_id == post_id,
            PostLikeModel.user_id == current_user_id
        )
        user_like_result = await self.session.execute(user_like_stmt)
        is_liked = user_like_result.scalar_one_or_none() is not None

        return PostReadDTO(
            id=post.id,
            author_id=post.author_id,
            content=post.content,
            images=[PostImageDTO(object_key=image.object_key, order=image.order) for image in post.images],
            created_at=post.created_at,
            likes_count=likes_count,
            is_current_user_likes=is_liked
        )

    async def get_images(
        self,
        profile_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25
    ) -> list[ImageDTO]:

        stmt = (
            select(PostImageModel, PostModel.created_at)
            .join(PostModel, PostImageModel.post_id == PostModel.id)
            .where(PostModel.author_id == profile_id)
        )

        if cursor:
            stmt = stmt.where(PostModel.created_at < cursor)

        stmt = (
            stmt
            .order_by(PostModel.created_at.desc(), PostImageModel.order)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        images = []

        for image, created_at in rows:
            images.append(
                ImageDTO(
                    post_id=image.post_id,
                    object_key=image.object_key,
                    created_at=created_at
                )
            )

        return images

    async def get_post_or_none(self, post_id: UUID):
        stmt = (
            select(PostModel)
            .where(PostModel.id == post_id)
            .options(selectinload(PostModel.images))
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_like(self, post_id: UUID, user_id: UUID) -> None:
        self.session.add(PostLikeModel(
                post_id=post_id,
                user_id=user_id
            ))

    async def delete_like(self, post_id: UUID, user_id: UUID) -> None:
        await self.session.execute(
                delete(PostLikeModel)
                .where(
                    PostLikeModel.post_id == post_id,
                    PostLikeModel.user_id == user_id
                )
            )

    async def is_put_like(self, post_id: UUID, user_id: UUID):
        stmt = select(PostLikeModel).where(
            PostLikeModel.post_id == post_id,
            PostLikeModel.user_id == user_id
        )
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none() is not None

    async def delete(self, post_id: UUID) -> None:
        await self.session.execute(
            delete(PostModel)
            .where(PostModel.id == post_id)
        )

from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from core.posts.entities import (
    CommentCreationDTO,
    CommentListItemDTO,
    CommentReadDTO,
    CommentReplyDTO,
    ImageDTO,
    PostCreationDTO,
    PostImageDTO,
    PostReadDTO,
)
from infrastructure.database.models.posts import PostCommentModel, PostImageModel, PostLikeModel, PostModel


class PostRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_post(
        self,
        author_id: UUID,
        post_data: PostCreationDTO,
        images: list[PostImageDTO] | None = None,
    ) -> PostReadDTO:
        post = PostModel(author_id=author_id, content=post_data.content)
        self.session.add(post)
        await self.session.flush()

        image_dtos = await self._save_images(post.id, images or [])

        return PostReadDTO(
            id=post.id,
            author_id=author_id,
            created_at=post.created_at,
            likes_count=0,
            is_current_user_likes=False,
            content=post.content,
            images=image_dtos,
        )

    async def get_user_posts(
        self,
        profile_id: UUID,
        current_user_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25,
    ) -> list[PostReadDTO]:
        posts = await self._fetch_posts_by_author(profile_id, cursor, limit)
        if not posts:
            return []

        post_ids = [p.id for p in posts]
        likes_count_map = await self._fetch_likes_counts(post_ids)
        user_liked_ids = await self._fetch_user_liked_post_ids(post_ids, current_user_id)

        return [
            self._build_post_read_dto(post, likes_count_map.get(post.id, 0), post.id in user_liked_ids)
            for post in posts
        ]

    async def get_by_id(self, post_id: UUID, current_user_id: UUID) -> PostReadDTO | None:
        post = await self._fetch_post_with_images(post_id)
        if post is None:
            return None

        likes_count = await self._fetch_single_post_likes_count(post_id)
        is_liked = await self.is_put_like(post_id, current_user_id)

        return self._build_post_read_dto(post, likes_count, is_liked)

    async def get_images(
        self,
        profile_id: UUID,
        cursor: datetime | None = None,
        limit: int = 25,
    ) -> list[ImageDTO]:
        stmt = (
            select(PostImageModel, PostModel.created_at)
            .join(PostModel, PostImageModel.post_id == PostModel.id)
            .where(PostModel.author_id == profile_id)
        )

        if cursor:
            stmt = stmt.where(PostModel.created_at < cursor)

        stmt = stmt.order_by(PostModel.created_at.desc(), PostImageModel.order).limit(limit)

        result = await self.session.execute(stmt)
        return [
            ImageDTO(post_id=image.post_id, object_key=image.object_key, created_at=created_at)
            for image, created_at in result.all()
        ]

    async def get_post_or_none(self, post_id: UUID) -> PostModel | None:
        stmt = (
            select(PostModel)
            .where(PostModel.id == post_id)
            .options(selectinload(PostModel.images))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_like(self, post_id: UUID, user_id: UUID) -> None:
        self.session.add(PostLikeModel(post_id=post_id, user_id=user_id))

    async def delete_like(self, post_id: UUID, user_id: UUID) -> None:
        await self.session.execute(
            delete(PostLikeModel).where(
                PostLikeModel.post_id == post_id,
                PostLikeModel.user_id == user_id,
            )
        )

    async def is_put_like(self, post_id: UUID, user_id: UUID) -> bool:
        stmt = select(PostLikeModel).where(
            PostLikeModel.post_id == post_id,
            PostLikeModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def delete(self, post_id: UUID) -> None:
        await self.session.execute(
            delete(PostModel)
            .where(PostModel.id == post_id)
        )

    async def create_comment(self, comment_data: CommentCreationDTO) -> CommentReadDTO:
        comment = PostCommentModel(
            author_id=comment_data.author_id,
            post_id=comment_data.post_id,
            parent_id=comment_data.parent_id,
            text=comment_data.text
        )
        self.session.add(comment)
        await self.session.flush()

        return CommentReadDTO(
            id=comment.id,
            author_id=comment.author_id,
            parent_id=comment.parent_id,
            post_id=comment.post_id,
            text=comment.text,
            created_at=comment.created_at
        )

    async def get_post_comments(
        self,
        post_id: UUID,
        limit: int = 15,
        cursor: datetime | None = None
    ) -> list[CommentReadDTO]:
        stmt = (
            select(PostCommentModel)
            .where(PostCommentModel.post_id == post_id)
            .order_by(PostCommentModel.created_at.desc())
            .limit(limit)
        )
        if cursor is not None:
            stmt = stmt.where(PostCommentModel.created_at < cursor)
        result = await self.session.execute(stmt)
        comments = list(result.scalars().all())
        if not comments:
            return []

        return [
            self._build_comment_read_dto(comment)
            for comment in comments
        ]

    async def get_root_comments(
        self,
        post_id: UUID,
        limit: int = 15,
        cursor: datetime | None = None
    ) -> list[CommentListItemDTO]:
        reply = aliased(PostCommentModel)

        stmt = (
            select(
                PostCommentModel,
                func.count(reply.id).label("reply_count")
            )
            .outerjoin(
                reply,
                reply.parent_id == PostCommentModel.id
            )
            .where(
                PostCommentModel.post_id == post_id,
                PostCommentModel.parent_id.is_(None)
            )
            .group_by(PostCommentModel.id)
            .order_by(PostCommentModel.created_at.desc())
            .limit(limit)
        )

        if cursor is not None:
            stmt = stmt.where(
                PostCommentModel.created_at < cursor
            )

        result = await self.session.execute(stmt)
        comments = result.all()
        if not comments:
            return []

        return [
            CommentListItemDTO(
                id=comment.id,
                post_id=comment.post_id,
                author_id=comment.author_id,
                parent_id=comment.parent_id,
                text=comment.text,
                created_at=comment.created_at,
                reply_count=reply_count,
                has_replies=reply_count > 0,
            )
            for comment, reply_count in comments
        ]

    async def get_comment_or_none(self, comment_id: UUID) -> CommentReadDTO | None:
        stmt = select(PostCommentModel).where(PostCommentModel.id == comment_id)
        result = await self.session.execute(stmt)
        comment = result.scalar_one_or_none()
        if comment is None:
            return None

        return CommentReadDTO(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            parent_id=comment.parent_id,
            text=comment.text,
            created_at=comment.created_at
        )

    async def get_comment_replies(
        self,
        comment_id: UUID,
        limit: int = 10,
        cursor: datetime | None = None
    ) -> list[CommentListItemDTO]:
        stmt = (
            select(PostCommentModel)
            .where(PostCommentModel.parent_id == comment_id)
            .order_by(PostCommentModel.created_at.desc())
            .limit(limit)
        )

        if cursor is not None:
            stmt = stmt.where(
                PostCommentModel.created_at < cursor
            )

        result = await self.session.execute(stmt)
        comments = result.scalars().all()
        if not comments:
            return []

        return [
            CommentReplyDTO(
                id=comment.id,
                post_id=comment.post_id,
                author_id=comment.author_id,
                parent_id=comment.parent_id,
                text=comment.text,
                created_at=comment.created_at,
            )
            for comment in comments
        ]

    async def update_comment_text(self, comment_id: UUID, new_text: str) -> None:
        await self.session.execute(
            update(PostCommentModel)
            .where(PostCommentModel.id == comment_id)
            .values(text=new_text)
        )

    async def delete_comment(self, comment_id: UUID) -> None:
        await self.session.execute(
            delete(PostCommentModel)
            .where(PostCommentModel.id == comment_id)
        )

    async def _save_images(self, post_id: UUID, images: list[PostImageDTO]) -> list[PostImageDTO]:
        saved = []
        for image in images:
            model = PostImageModel(post_id=post_id, object_key=image.object_key, order=image.order)
            self.session.add(model)
            await self.session.flush()
            saved.append(PostImageDTO(object_key=model.object_key, order=model.order))
        return saved

    async def _fetch_posts_by_author(
        self,
        profile_id: UUID,
        cursor: datetime | None,
        limit: int,
    ) -> list[PostModel]:
        stmt = (
            select(PostModel)
            .where(PostModel.author_id == profile_id)
            .options(selectinload(PostModel.images))
            .order_by(PostModel.created_at.desc())
            .limit(limit)
        )
        if cursor is not None:
            stmt = stmt.where(PostModel.created_at < cursor)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _fetch_post_with_images(self, post_id: UUID) -> PostModel | None:
        stmt = (
            select(PostModel)
            .where(PostModel.id == post_id)
            .options(selectinload(PostModel.images))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _fetch_likes_counts(self, post_ids: list[UUID]) -> dict[UUID, int]:
        stmt = (
            select(PostLikeModel.post_id, func.count(PostLikeModel.user_id))
            .where(PostLikeModel.post_id.in_(post_ids))
            .group_by(PostLikeModel.post_id)
        )
        result = await self.session.execute(stmt)
        return dict(result.all())

    async def _fetch_user_liked_post_ids(self, post_ids: list[UUID], user_id: UUID) -> set[UUID]:
        stmt = select(PostLikeModel.post_id).where(
            PostLikeModel.post_id.in_(post_ids),
            PostLikeModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return {row[0] for row in result.all()}

    async def _fetch_single_post_likes_count(self, post_id: UUID) -> int:
        stmt = select(func.count(PostLikeModel.user_id)).where(PostLikeModel.post_id == post_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    @staticmethod
    def _build_post_read_dto(post: PostModel, likes_count: int, is_liked: bool) -> PostReadDTO:
        return PostReadDTO(
            id=post.id,
            author_id=post.author_id,
            content=post.content,
            images=[PostImageDTO(object_key=img.object_key, order=img.order) for img in post.images],
            created_at=post.created_at,
            likes_count=likes_count,
            is_current_user_likes=is_liked,
        )

    @staticmethod
    def _build_comment_read_dto(comment: PostCommentModel) -> CommentReadDTO:
        return CommentReadDTO(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            parent_id=comment.parent_id,
            text=comment.text,
            created_at=comment.created_at,
        )

from datetime import datetime
from uuid import UUID

from sqlalchemy import Select, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.posts.entities import (
    CommentAuthorDTO,
    CommentCreationDTO,
    CommentDTO,
)
from infrastructure.database.models.posts import PostCommentModel
from infrastructure.database.models.profile import ProfileModel


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, comment_data: CommentCreationDTO, root_comment_id: UUID | None) -> PostCommentModel:
        comment = PostCommentModel(
            author_id=comment_data.author_id,
            post_id=comment_data.post_id,
            parent_id=comment_data.parent_id,
            root_comment_id=root_comment_id,
            text=comment_data.text
        )
        self.session.add(comment)
        await self.session.flush()

        return comment

    async def get_root_comments(
        self,
        post_id: UUID,
        limit: int = 15,
        cursor: datetime | None = None
    ) -> list[CommentDTO]:
        stmt = (
            select(PostCommentModel, ProfileModel)
            .where(
                PostCommentModel.post_id == post_id,
                PostCommentModel.parent_id.is_(None),
                PostCommentModel.root_comment_id.is_(None),
            )
            .join(ProfileModel, PostCommentModel.author_id == ProfileModel.id)
            .order_by(PostCommentModel.created_at.desc())
            .limit(limit)
        )
        if cursor is not None:
            stmt = stmt.where(
                PostCommentModel.created_at < cursor
            )

        return await self._load_comments(stmt)

    async def get_comment_thread(
        self,
        root_comment_id: UUID,
        limit: int = 10,
        cursor: datetime | None = None
    ) -> list[CommentDTO]:
        stmt = (
            select(PostCommentModel, ProfileModel)
            .where(PostCommentModel.root_comment_id == root_comment_id)
            .join(ProfileModel, PostCommentModel.author_id == ProfileModel.id)
            .order_by(PostCommentModel.created_at.desc())
            .limit(limit)
        )
        if cursor is not None:
            stmt = stmt.where(
                PostCommentModel.created_at < cursor
            )

        return await self._load_comments(stmt)

    async def update_thread_replies_count(self, root_comment_id: UUID, value: int) -> None:
        await self.session.execute(
            update(PostCommentModel)
            .where(PostCommentModel.id == root_comment_id)
            .values(thread_replies_count=PostCommentModel.thread_replies_count + value)
        )

    async def get_comment_or_none(self, comment_id: UUID) -> PostCommentModel | None:
        stmt = select(PostCommentModel).where(PostCommentModel.id == comment_id)
        comment = await self.session.execute(stmt)
        return comment.scalar_one_or_none()

    async def update_text(self, comment_id: UUID, new_text: str) -> None:
        await self.session.execute(
            update(PostCommentModel)
            .where(PostCommentModel.id == comment_id)
            .values(text=new_text)
        )

    async def delete(self, comment_id: UUID) -> None:
        await self.session.execute(
            delete(PostCommentModel)
            .where(PostCommentModel.id == comment_id)
        )

    async def _load_comments(self, stmt: Select) -> list[CommentDTO]:
        result = await self.session.execute(stmt)
        comments = result.all()
        return [
            self._build_comment_dto(comment, profile)
            for comment, profile in comments
        ]

    def _build_comment_dto(self, comment: PostCommentModel, author: ProfileModel) -> CommentDTO:
        return CommentDTO(
            id=comment.id,
            author=self._build_comment_author_dto(author),
            post_id=comment.post_id,
            parent_id=comment.parent_id,
            text=comment.text,
            root_comment_id=comment.root_comment_id,
            created_at=comment.created_at,
            replies_count=comment.thread_replies_count,
            has_replies=comment.thread_replies_count > 0,
        )

    @staticmethod
    def _build_comment_author_dto(author: ProfileModel) -> CommentAuthorDTO:
        return CommentAuthorDTO(
            author_id=author.id,
            username=author.username,
            first_name=author.first_name,
            last_name=author.last_name,
            avatar_url=author.avatar_key
        )

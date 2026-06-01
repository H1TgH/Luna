from datetime import datetime
from uuid import UUID

from core.exceptions import PermissionDeniedException
from core.posts.entities import CommentAuthorDTO, CommentCreationDTO, CommentDTO, CommentsPageDTO
from core.posts.exceptions import CommentDoesNotExistException, InvalidCommentParentException, PostDoesNotExistException
from infrastructure.database.models.posts import PostCommentModel
from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.repositories.comment import CommentRepository
from infrastructure.database.repositories.posts import PostRepository
from infrastructure.database.repositories.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings


class CommentService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_comment(self, data: CommentCreationDTO) -> CommentDTO:
        async with self.uow() as session:
            post_repo = PostRepository(session)
            comment_repo = CommentRepository(session)
            profile_repository = ProfileRepository(session)

            await self._get_post_or_raise(post_repo, data.post_id)

            root_comment_id = None
            if data.parent_id:
                parent = await self._get_parent_comment_or_raise(comment_repo, data.parent_id)
                root_comment_id = self._determine_root_comment(comment_repo, parent)

            comment = await comment_repo.create(data, root_comment_id)
            if root_comment_id is not None:
                await comment_repo.update_thread_replies_count(root_comment_id, 1)

            author = await profile_repository.get_by_user_id(data.author_id)
            avatar_url = self._build_avatar_url(comment.author.avatar_key)
            return self._build_comment_dto(comment, author, avatar_url)

    async def get_root_comments(
        self,
        post_id: UUID,
        limit: int = 15,
        cursor: datetime | None = None
    ) -> CommentsPageDTO:
        async with self.uow() as session:
            repo = CommentRepository(session)
            comments = await repo.get_root_comments(post_id, limit + 1, cursor)

            comments, has_next, next_cursor = self._paginate(comments, limit)
            for comment in comments:
                comment.author.avatar_url = self._build_avatar_url(comment.author.avatar_url)

            return CommentsPageDTO(comments, next_cursor, has_next)

    async def get_comment_thread(
        self,
        comment_id: UUID,
        limit: int = 10,
        cursor: datetime | None = None
    ) -> CommentsPageDTO:
        async with self.uow() as session:
            repo = CommentRepository(session)
            comments = await repo.get_comment_thread(comment_id, limit + 1, cursor)

            comments, has_next, next_cursor = self._paginate(comments, limit)
            for comment in comments:
                comment.author.avatar_url = self._build_avatar_url(comment.author.avatar_url)

            return CommentsPageDTO(comments, next_cursor, has_next)

    async def delete_comment(self, comment_id: UUID, current_user_id: UUID) -> None:
        async with self.uow() as session:
            repo = CommentRepository(session)
            comment = await self._ensure_comment_exists(repo, comment_id)
            if comment.author.author_id != current_user_id:
                raise PermissionDeniedException("You are not allowed to delete this comment")
            await repo.delete(comment_id)

    @staticmethod
    async def _ensure_comment_exists(repository: CommentRepository, comment_id: UUID) -> CommentDTO:
        comment = await repository.get_comment_or_none(comment_id)
        if comment is None:
            raise CommentDoesNotExistException("Comment does not exist")
        return comment

    def _paginate(self, comments: list[CommentDTO], limit: int) -> tuple[list[CommentDTO], bool, datetime | None]:
        has_next = len(comments) > limit
        comments = comments[:limit]
        next_cursor = comments[-1].created_at if comments else None

        return comments, has_next, next_cursor

    @staticmethod
    def _build_avatar_url(avatar_key: str) -> str:
        return f"{settings.s3.public_endpoint}/media/avatars/{avatar_key}"

    @staticmethod
    async def _get_post_or_raise(repo: PostRepository, post_id: UUID):
        post = await repo.get_post_or_none(post_id)
        if post is None:
            raise PostDoesNotExistException("Post does not exist")
        return post

    @staticmethod
    def _determine_root_comment(repo: CommentRepository, parent: PostCommentModel) -> UUID:
        root_comment_id = (
            parent.id if parent.parent_id is None
            else parent.root_comment_id
        )
        return root_comment_id

    @staticmethod
    async def _get_parent_comment_or_raise(repo: CommentRepository, parent_id: UUID) -> PostCommentModel:
        parent = await repo.get_comment_or_none(parent_id)
        if parent is None:
            raise InvalidCommentParentException("Parent comment does not exist")
        return parent

    def _build_comment_dto(self, comment: PostCommentModel, author: ProfileModel, avatar_url: str) -> CommentDTO:
        return CommentDTO(
            id=comment.id,
            author=self._build_comment_author_dto(author, avatar_url),
            post_id=comment.post_id,
            parent_id=comment.parent_id,
            text=comment.text,
            root_comment_id=comment.root_comment_id,
            created_at=comment.created_at,
            replies_count=comment.thread_replies_count,
            has_replies=comment.thread_replies_count > 0,
        )

    @staticmethod
    def _build_comment_author_dto(author: ProfileModel, avatar_url: str) -> CommentAuthorDTO:
        return CommentAuthorDTO(
            author_id=author.id,
            username=author.username,
            first_name=author.first_name,
            last_name=author.last_name,
            avatar_url=avatar_url
        )


def get_comment_service() -> CommentService:
    return CommentService(UnitOfWork())

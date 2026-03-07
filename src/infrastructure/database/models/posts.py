from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime as PGDateTime, ForeignKey, PrimaryKeyConstraint, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.database import Base


class PostModel(Base):
    __tablename__ = "posts"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    author_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False
    )

    content: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    images: Mapped[list["PostImageModel"]] = relationship(
        "PostImageModel",
        order_by="PostImageModel.order"
    )

    author: Mapped["ProfileModel"] = relationship(
        "ProfileModel"
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PostImageModel(Base):
    __tablename__ = "post_images"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    post_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False
    )

    object_key: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    order: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )


class PostLikeModel(Base):
    __tablename__ = "post_likes"

    post_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("posts.id", ondelete="CASCADE")
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("profiles.id", ondelete="CASCADE")
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        PrimaryKeyConstraint("post_id", "user_id"),
    )

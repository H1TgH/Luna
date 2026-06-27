from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime as PGDateTime, Enum as PGEnum, ForeignKey, PrimaryKeyConstraint, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from core.chat.enums import MessageTypeEnum
from infrastructure.database.database import Base


class ChatModel(Base):
    __tablename__ = "chats"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    is_group: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    creator_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("profiles.id", ondelete="SET NULL"),
        nullable=True
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    avatar_key: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    last_message_id: Mapped[UUID] = mapped_column(
        PGUUID,
        nullable=True,
        default=None
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        server_default=func.now()
    )


class ChatParticipantModel(Base):
    __tablename__ = "chat_participants"

    chat_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("chats.id", ondelete="CASCADE")
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("profiles.id", ondelete="CASCADE")
    )

    last_read_message_id: Mapped[UUID] = mapped_column(
        PGUUID,
        nullable=True,
        default=None
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        PrimaryKeyConstraint("chat_id", "user_id", name="pk_chat_user"),
    )


class MessageModel(Base):
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    chat_id: Mapped[UUID] = mapped_column(
        PGUUID, ForeignKey("chats.id", ondelete="CASCADE")
    )

    sender_id: Mapped[UUID | None] = mapped_column(
        PGUUID,
        ForeignKey("profiles.id", ondelete="SET NULL"),
        nullable=True
    )

    type: Mapped[MessageTypeEnum] = mapped_column(
        PGEnum(MessageTypeEnum, name="message_type_enum")
    )

    content: Mapped[str] = mapped_column(
        String
    )

    is_edited: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        server_default=func.now()
    )

    edited_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=True,
        default=None
    )

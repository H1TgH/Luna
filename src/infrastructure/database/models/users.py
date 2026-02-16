from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime as PGDateTime, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4,
    )

    email: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
    )

    password: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    is_email_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
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

    profile: Mapped["ProfileModel | None"] = relationship(
        "ProfileModel",
        back_populates="user",
        uselist=False,
    )

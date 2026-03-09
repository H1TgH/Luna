from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date as PGDate, Enum as PGEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.users.profile.enums import GenderEnum
from infrastructure.database.database import Base


class ProfileModel(Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    username: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )

    birth_date: Mapped[date] = mapped_column(
        PGDate,
        nullable=False,
    )

    gender: Mapped[GenderEnum] = mapped_column(
        PGEnum(GenderEnum, name="gender_enum"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(256),
        nullable=True,
    )

    avatar_uploaded: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )

    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="profile",
        uselist=False,
    )

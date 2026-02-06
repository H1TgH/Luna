from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date as PGDate, DateTime as PGDateTime, Enum as PGEnum, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.database import Base


class GenderEnum(StrEnum):
    MALE = "Male"
    FEMALE = "Female"


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4,
    )

    username: Mapped[String] = mapped_column(
        String(32),
        unique=True,
        nullable=True,
    )

    email: Mapped[String] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
    )

    password: Mapped[String] = mapped_column(
        String(60),
        nullable=False,
    )

    first_name: Mapped[String] = mapped_column(
        String(16),
        nullable=False,
    )

    last_name: Mapped[String] = mapped_column(
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

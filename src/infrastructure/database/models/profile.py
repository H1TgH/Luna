from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date as PGDate, DateTime as PGDateTime, Enum as PGEnum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.profile.enums import GenderEnum
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

    last_seen: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    avatar_key: Mapped[str] = mapped_column(
        String,
        nullable=True,
    )

    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="profile",
        uselist=False,
    )

    __table_args__ = (
        Index(
            "profiles_username_trgm_idx",
            "username",
            postgresql_using="gin",
            postgresql_ops={"username": "gin_trgm_ops"}
        ),
        Index(
            "profiles_first_name_trgm_idx",
            "first_name",
            postgresql_using="gin",
            postgresql_ops={"first_name": "gin_trgm_ops"}
        ),
        Index(
            "profiles_last_name_trgm_idx",
            "last_name",
            postgresql_using="gin",
            postgresql_ops={"last_name": "gin_trgm_ops"}
        ),
    )

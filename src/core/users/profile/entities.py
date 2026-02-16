from dataclasses import dataclass
from datetime import date
from uuid import UUID

from infrastructure.database.models.profile import GenderEnum


@dataclass
class ProfileCreationDTO:
    username: str
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


@dataclass
class ProfileReadDTO:
    id: UUID
    user_id: UUID
    username: str
    first_name: str
    last_name: str
    gender: GenderEnum
    birth_date: date
    avatar_uploaded: bool
    status: str | None


@dataclass
class ProfileUpdateDTO:
    first_name: str | None
    last_name: str | None
    birth_date: date | None
    gender: GenderEnum | None
    status: str | None

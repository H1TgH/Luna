from dataclasses import asdict, dataclass
from datetime import date
from uuid import UUID

from core.profile.enums import GenderEnum
from infrastructure.database.models.profile import ProfileModel


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
    username: str
    first_name: str
    last_name: str
    gender: GenderEnum
    birth_date: date
    avatar_url: str | None
    status: str | None

    @classmethod
    def from_model(cls, profile: ProfileModel, avatar_url: str | None) -> "ProfileReadDTO":
        return cls(
            id=profile.id,
            username=profile.username,
            first_name=profile.first_name,
            last_name=profile.last_name,
            birth_date=profile.birth_date,
            gender=profile.gender,
            avatar_url=avatar_url,
            status=profile.status
        )


@dataclass
class ProfileUpdateDTO:
    first_name: str | None
    last_name: str | None
    birth_date: date | None
    gender: GenderEnum | None
    status: str | None

    def to_update_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}

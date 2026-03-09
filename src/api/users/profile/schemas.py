from datetime import date
from uuid import UUID

from pydantic import BaseModel

from core.users.profile.enums import GenderEnum


class ProfileCreationSchema(BaseModel):
    username: str
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


class ProfileSchema(BaseModel):
    id: UUID
    username: str
    first_name: str
    last_name: str
    gender: GenderEnum
    birth_date: date
    avatar_url: str | None
    status: str | None


class ProfileUpdateSchema(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    birth_date: date | None = None
    gender: GenderEnum | None = None
    status: str | None = None

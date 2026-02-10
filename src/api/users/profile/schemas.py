from datetime import date
from uuid import UUID

from pydantic import BaseModel

from infrastructure.database.models.profile import GenderEnum


class ProfileCreationSchema(BaseModel):
    username: str
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


class ProfileSchema(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    first_name: str
    last_name: str
    gender: GenderEnum
    birth_date: date
    avatar_uploaded: bool
    status: str | None

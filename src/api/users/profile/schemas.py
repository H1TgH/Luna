from datetime import date

from pydantic import BaseModel

from infrastructure.database.models.profile import GenderEnum


class ProfileCreationSchema(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum

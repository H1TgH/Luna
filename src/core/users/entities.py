from dataclasses import dataclass
from datetime import date

from infrastructure.database.models.users import GenderEnum


@dataclass
class UserCreationDTO:
    email: str
    password: str
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


@dataclass
class UserLoginDTO:
    email: str
    password: str


@dataclass
class UserUpdateDTO:
    email: str | None
    password: str | None
    username: str | None
    first_name: str | None
    last_name: str | None
    is_email_confirmed: bool | None
    birth_date: date | None
    gender: GenderEnum | None

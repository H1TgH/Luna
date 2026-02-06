from datetime import date

from pydantic import BaseModel, EmailStr

from infrastructure.database.models.users import GenderEnum


class UserRegistrationSchema(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str

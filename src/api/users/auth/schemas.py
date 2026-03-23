
from pydantic import BaseModel, EmailStr


class UserRegistrationSchema(BaseModel):
    email: EmailStr
    password: str


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokensSchema(BaseModel):
    access_token: str
    refresh_token: str


class TokenSchema(BaseModel):
    token: str


class RequestPasswordResetSchema(BaseModel):
    email: str


class PasswordResetSchema(BaseModel):
    new_Password: str

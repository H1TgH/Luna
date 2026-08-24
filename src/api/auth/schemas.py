
from pydantic import BaseModel, EmailStr


class UserRegistrationSchema(BaseModel):
    email: EmailStr
    password: str


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class RequestPasswordResetSchema(BaseModel):
    email: str


class PasswordResetSchema(BaseModel):
    new_password: str

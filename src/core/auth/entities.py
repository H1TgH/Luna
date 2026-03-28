from dataclasses import dataclass
from uuid import UUID


@dataclass
class AuthenticatedUserDTO:
    id: UUID


@dataclass
class CurrentUserDTO:
    id: UUID
    email: str


@dataclass
class UserCreationDTO:
    email: str
    password: str


@dataclass
class UserLoginDTO:
    email: str
    password: str

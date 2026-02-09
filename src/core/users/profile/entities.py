from dataclasses import dataclass
from datetime import date

from infrastructure.database.models.profile import GenderEnum


@dataclass
class ProfileCreationDTO:
    first_name: str
    last_name: str
    birth_date: date
    gender: GenderEnum


@dataclass
class ProfileReadDTO:
    first_name: str
    last_name: str

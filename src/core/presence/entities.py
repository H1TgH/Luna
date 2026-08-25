from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class PresenceReadDTO:
    user_id: UUID
    is_online: bool
    last_seen: datetime | None

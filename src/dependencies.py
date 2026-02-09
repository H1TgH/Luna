from fastapi import Depends
from fastapi.security import APIKeyHeader

from core.users.auth.services import AuthService, get_auth_service


async def get_current_user(
    token: str = Depends(APIKeyHeader(name="Authorization")),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.get_current_user(token)

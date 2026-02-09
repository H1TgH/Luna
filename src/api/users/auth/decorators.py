from functools import wraps

from fastapi import HTTPException, status

from core.users.auth.exceptions import InvalidCredentialsException, InvalidTokenException, UserAlreadyExistsException


def handle_auth_exceptions(func):
    @wraps(func)
    async def wrapped(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except UserAlreadyExistsException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            ) from e
        except (InvalidCredentialsException, InvalidTokenException) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            ) from e

    return wrapped

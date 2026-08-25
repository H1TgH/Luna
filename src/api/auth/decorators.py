from functools import wraps

from fastapi import HTTPException, status

from core.auth.exceptions import (
    InvalidCredentialsException,
    InvalidTokenException,
    TokenIsMissingException,
    UserAlreadyExistsException,
    UserDoesNotExistException,
)


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
        except (InvalidCredentialsException, InvalidTokenException, TokenIsMissingException) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            ) from e
        except UserDoesNotExistException as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            ) from e

    return wrapped

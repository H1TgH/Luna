from functools import wraps

from core.profile.exceptions import ProfileAlreadyExistsException, ProfileDoesNotExistException
from fastapi import HTTPException, status


def handle_profile_exceptions(func):
    @wraps(func)
    async def wrapped(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except (ProfileAlreadyExistsException, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            ) from e
        except ProfileDoesNotExistException as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            ) from e

    return wrapped

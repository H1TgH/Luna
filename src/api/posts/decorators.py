from functools import wraps

from fastapi import HTTPException, status

from core.exceptions import PermissionDeniedException
from core.posts.exceptions import EmptyPostException, PostDoesNotExistException, UnacceptableImageCountException


def handle_post_exceptions(func):
    @wraps(func)
    async def wrapped(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except (UnacceptableImageCountException, EmptyPostException) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            ) from e
        except PostDoesNotExistException as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            ) from e
        except PermissionDeniedException as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            ) from e

    return wrapped

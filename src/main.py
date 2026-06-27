from fastapi import APIRouter, FastAPI

from api.auth.router import auth_router
from api.chat.router import chat_router
from api.posts.router import posts_router
from api.presense.router import presense_router
from api.profile.router import profile_router


app = FastAPI()

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(profile_router)
api_v1_router.include_router(posts_router)
api_v1_router.include_router(presense_router)
api_v1_router.include_router(chat_router)

app.include_router(api_v1_router)

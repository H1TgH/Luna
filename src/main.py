from fastapi import APIRouter, FastAPI

from api.users.auth.router import auth_router
from api.users.profile.router import profile_router


app = FastAPI()

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(profile_router)

app.include_router(api_v1_router)

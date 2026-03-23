from celery import Celery

from settings import settings


celery = Celery(
    "worker",
    broker=settings.redis.celery_url,
    backend=settings.redis.celery_url,
    include=[
        "core.users.auth.tasks"
    ]
)

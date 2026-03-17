from infrastructure.celery_app.worker import celery
from infrastructure.email.sender import EmailSender
from infrastructure.email.renderer import EmailRenderer
from settings import settings


sender = EmailSender(
    host=settings.email.host,
    port=settings.email.port,
    username=settings.email.name,
    password=settings.email.password.get_secret_value()
)

renderer = EmailRenderer()


@celery.task
def send_confirmation_email(to: str, confirmation_url: str):
    context = {"confirmation_url": confirmation_url}
    text, html = renderer.render("email-confirm.html", context)

    sender.send(to, "Подтверждение почты", text, html)

from infrastructure.celery_app.worker import celery
from infrastructure.email.renderer import EmailRenderer
from infrastructure.email.sender import EmailSender
from settings import settings


sender = EmailSender(
    host=settings.email.host,
    port=settings.email.port,
    username=settings.email.name,
    password=settings.email.password.get_secret_value()
)

renderer = EmailRenderer()


@celery.task
def send_confirmation_email(to: str, confirmation_url: str) -> None:
    context = {"confirmation_url": confirmation_url}
    text, html = renderer.render("email-confirm.html", context)

    sender.send(to, "Подтверждение почты", text, html)


@celery.task
def send_reset_password_email(to, reset_url: str) -> None:
    context = {"reset_url": reset_url}
    text, html = renderer.render("password-reset.html", context)

    sender.send(to, "Смена пароля", text, html)

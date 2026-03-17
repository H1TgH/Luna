import smtplib
from email.message import EmailMessage


class EmailSender:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

    def send(self, to, subject, content, html):
        email = EmailMessage()
        email["To"] = to
        email["Subject"] = subject
        email.set_content(content)
        email.add_alternative(html, subtype="html")

        with smtplib.SMTP(self.host, self.port) as smtp:
            smtp.starttls()
            smtp.login(self.username, self.password)
            smtp.send_message(email)

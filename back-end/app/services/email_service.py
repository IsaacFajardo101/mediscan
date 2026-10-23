"""Brevo SMTP integration for authentication emails."""

import asyncio
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage


logger = logging.getLogger(__name__)


def _send_smtp_message(
    host: str,
    port: int,
    username: str,
    password: str,
    message: EmailMessage,
) -> bool:
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(host, port, timeout=5) as client:
            client.starttls(context=context)
            client.login(username, password)
            client.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        logger.warning("Brevo SMTP verification email delivery failed")
        return False


async def send_verification_code(
    email: str,
    code: str,
    expires_in_minutes: int = 10,
) -> bool:
    """Send a short-lived verification code without blocking the event loop."""
    host = os.getenv("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
    username = os.getenv("BREVO_SMTP_USERNAME")
    password = os.getenv("BREVO_SMTP_PASSWORD")
    sender_email = os.getenv("BREVO_SENDER_EMAIL")
    if not username or not password or not sender_email:
        logger.warning("Brevo SMTP verification email is not configured")
        return False

    try:
        port = int(os.getenv("BREVO_SMTP_PORT", "587"))
    except ValueError:
        logger.warning("Brevo SMTP port is invalid")
        return False

    sender_name = os.getenv("BREVO_SENDER_NAME", "MediScan")
    text_content = (
        f"Your MediScan verification code is {code}. "
        f"It expires in {expires_in_minutes} minutes. "
        "Ignore this email if you did not request it."
    )
    message = EmailMessage()
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = email
    message["Subject"] = "Your MediScan verification code"
    message.set_content(text_content)
    message.add_alternative(
        "<p>Use this MediScan verification code:</p>"
        f"<p><strong>{code}</strong></p>"
        f"<p>This code expires in {expires_in_minutes} minutes. "
        "Ignore this email if you did not request it.</p>",
        subtype="html",
    )

    return await asyncio.to_thread(
        _send_smtp_message,
        host,
        port,
        username,
        password,
        message,
    )

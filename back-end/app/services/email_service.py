# Brevo API integration & session tokens

import asyncio
import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)
_BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _send_brevo_request(api_key: str, payload: dict[str, object]) -> bool:
    request = Request(
        _BREVO_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": api_key,
            "accept": "application/json",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            return 200 <= response.status < 300
    except HTTPError as exc:
        logger.warning("Brevo verification email rejected (status=%s)", exc.code)
        return False
    except (URLError, TimeoutError, OSError):
        logger.warning("Brevo verification email delivery failed")
        return False


async def send_verification_code(
    email: str,
    code: str,
    expires_in_minutes: int = 10,
) -> bool:
    """Send a short-lived verification code without blocking the event loop."""
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("BREVO_SENDER_EMAIL")
    if not api_key or not sender_email:
        logger.warning("Brevo verification email is not configured")
        return False

    sender_name = os.getenv("BREVO_SENDER_NAME", "MediScan")
    html = (
        "<p>Use this MediScan verification code:</p>"
        f"<p><strong>{code}</strong></p>"
        f"<p>This code expires in {expires_in_minutes} minutes. Ignore this email if you did not "
        "request it.</p>"
    )
    payload: dict[str, object] = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": email}],
        "subject": "Your MediScan verification code",
        "textContent": (
            f"Your MediScan verification code is {code}. "
            f"It expires in {expires_in_minutes} minutes. "
            "Ignore this email if you did not request it."
        ),
        "htmlContent": html,
    }

    try:
        delivered = await asyncio.to_thread(_send_brevo_request, api_key, payload)
    except Exception:
        logger.warning("Brevo verification email delivery failed")
        return False
    if not delivered:
        return False
    return True
# (Joshua)
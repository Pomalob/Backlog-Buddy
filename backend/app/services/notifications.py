import httpx
import aiosmtplib
from email.mime.text import MIMEText

from app.core.config import settings


async def send_telegram(message: str, chat_id: str = "") -> bool:
    effective_chat_id = chat_id or settings.TELEGRAM_CHAT_ID
    if not settings.TELEGRAM_BOT_TOKEN or not effective_chat_id:
        return False
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.post(url, json={"chat_id": effective_chat_id, "text": message, "parse_mode": "HTML"})
            return r.status_code == 200
        except Exception:
            return False


async def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return False
    msg = MIMEText(body, "html")
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception:
        return False

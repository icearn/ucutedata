from __future__ import annotations

import json
import smtplib
from email.message import EmailMessage

import requests

from message_hub.config import settings
from message_hub.models import NotificationMessage


def dispatch_message(message: NotificationMessage) -> list[dict]:
    results = []
    for channel in _resolve_channels(message.channel):
        try:
            if channel == "console":
                results.append(_dispatch_console(message))
            elif channel == "slack":
                results.append(_dispatch_slack(message))
            elif channel == "email":
                results.append(_dispatch_email(message))
            elif channel in {"sms", "whatsapp", "im", "webhook"}:
                results.append(_dispatch_webhook(channel, message))
            else:
                results.append(
                    {
                        "channel": channel,
                        "status": "unsupported",
                        "response": f"Unsupported channel: {channel}",
                    }
                )
        except Exception as exc:
            results.append(
                {
                    "channel": channel,
                    "status": "failed",
                    "response": str(exc),
                }
            )
    return results


def describe_channels() -> dict:
    return {
        "default_channels": settings.default_channels,
        "configured_channels": {
            "console": True,
            "slack": bool(settings.slack_webhook_url),
            "email": bool(settings.smtp_host and settings.smtp_from_email),
            "sms": bool(settings.sms_webhook_url),
            "whatsapp": bool(settings.whatsapp_webhook_url),
            "im": bool(settings.im_webhook_url),
            "webhook_targets": settings.webhook_targets,
        },
    }


def _resolve_channels(channel_value: str | None) -> list[str]:
    if not channel_value or channel_value == "common_api":
        return settings.default_channels or ["console"]
    return [item.strip() for item in channel_value.split(",") if item.strip()]


def _dispatch_console(message: NotificationMessage) -> dict:
    print(
        "[message-hub] console delivery",
        json.dumps(
            {
                "message_id": message.message_id,
                "source_app": message.source_app,
                "event_type": message.event_type,
                "title": message.title,
                "body": message.body,
                "channel": message.channel,
                "channel_target": message.channel_target,
            }
        ),
        flush=True,
    )
    return {"channel": "console", "status": "sent", "response": "Logged to stdout"}


def _dispatch_slack(message: NotificationMessage) -> dict:
    webhook_url = message.channel_target or settings.slack_webhook_url
    if not webhook_url:
        return {"channel": "slack", "status": "not_configured", "response": "SLACK_WEBHOOK_URL is not configured"}

    response = requests.post(
        webhook_url,
        json={"text": f"*{message.title}*\n{message.body}"},
        timeout=10,
    )
    response.raise_for_status()
    return {"channel": "slack", "status": "sent", "response": response.text[:500] if response.text else ""}


def _dispatch_email(message: NotificationMessage) -> dict:
    if not settings.smtp_host or not settings.smtp_from_email:
        return {"channel": "email", "status": "not_configured", "response": "SMTP settings are not configured"}

    recipient = message.channel_target
    if not recipient:
        return {"channel": "email", "status": "not_configured", "response": "channel_target must hold the recipient email"}

    email = EmailMessage()
    email["Subject"] = message.title
    email["From"] = settings.smtp_from_email
    email["To"] = recipient
    email.set_content(message.body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(email)

    return {"channel": "email", "status": "sent", "response": f"Sent to {recipient}"}


def _dispatch_webhook(channel: str, message: NotificationMessage) -> dict:
    url = _resolve_webhook_url(channel, message.channel_target)
    if not url:
        return {
            "channel": channel,
            "status": "not_configured",
            "response": f"No webhook target configured for channel {channel}",
        }

    response = requests.post(
        url,
        json=message.model_dump(),
        timeout=10,
    )
    response.raise_for_status()
    return {"channel": channel, "status": "sent", "response": response.text[:500] if response.text else ""}


def _resolve_webhook_url(channel: str, channel_target: str | None) -> str | None:
    if channel_target and channel_target.startswith("http"):
        return channel_target

    if channel == "sms":
        return channel_target or settings.sms_webhook_url
    if channel == "whatsapp":
        return channel_target or settings.whatsapp_webhook_url
    if channel == "im":
        return channel_target or settings.im_webhook_url
    if channel == "webhook" and channel_target:
        return settings.webhook_targets.get(channel_target, channel_target if channel_target.startswith("http") else "")
    return settings.webhook_targets.get(channel)

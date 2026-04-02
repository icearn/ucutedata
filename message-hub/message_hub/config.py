from __future__ import annotations

import json
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
    message_hub_topic: str = os.getenv("MESSAGE_HUB_TOPIC", "message-hub.notifications.v1")
    consumer_group: str = os.getenv("MESSAGE_HUB_CONSUMER_GROUP", "message-hub")
    consumer_poll_ms: int = int(os.getenv("MESSAGE_HUB_CONSUMER_POLL_MS", "1000"))
    default_channels_raw: str = os.getenv("MESSAGE_HUB_DEFAULT_CHANNELS", "console")

    slack_webhook_url: str | None = os.getenv("SLACK_WEBHOOK_URL")
    smtp_host: str | None = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str | None = os.getenv("SMTP_USERNAME")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_from_email: str | None = os.getenv("SMTP_FROM_EMAIL")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

    sms_webhook_url: str | None = os.getenv("SMS_WEBHOOK_URL")
    whatsapp_webhook_url: str | None = os.getenv("WHATSAPP_WEBHOOK_URL")
    im_webhook_url: str | None = os.getenv("IM_WEBHOOK_URL")
    webhook_targets_json: str = os.getenv("MESSAGE_HUB_WEBHOOK_TARGETS_JSON", "{}")

    @property
    def default_channels(self) -> list[str]:
        return [item.strip() for item in self.default_channels_raw.split(",") if item.strip()]

    @property
    def webhook_targets(self) -> dict[str, str]:
        try:
            parsed = json.loads(self.webhook_targets_json or "{}")
        except json.JSONDecodeError:
            return {}
        return {str(key): str(value) for key, value in parsed.items()}


settings = Settings()

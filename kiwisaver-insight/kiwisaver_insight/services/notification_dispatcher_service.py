from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict
from uuid import uuid4

import requests

from kiwisaver_insight.config import settings
from kiwisaver_insight.utils.kafka import publish_json_message


def dispatch_alert_message(payload: Dict) -> Dict:
    if settings.kafka_bootstrap_servers:
        message = _build_message_hub_envelope(payload)
        try:
            metadata = publish_json_message(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                topic=settings.message_hub_topic,
                payload=message,
                timeout_seconds=settings.asb_timeout_seconds,
            )
            return {
                "status": "queued_to_message_hub",
                "response": (
                    f"Published to {metadata['topic']} partition={metadata['partition']} "
                    f"offset={metadata['offset']}"
                ),
            }
        except Exception as exc:
            if not settings.alert_dispatch_webhook_url:
                return {
                    "status": "dispatch_failed",
                    "response": f"Kafka publish failed: {exc}",
                }

    webhook_url = settings.alert_dispatch_webhook_url
    if not webhook_url:
        print(f"[alerts] No dispatch webhook configured. Recorded payload: {json.dumps(payload)}")
        return {
            "status": "pending_channel",
            "response": "ALERT_DISPATCH_WEBHOOK_URL is not configured.",
        }

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=settings.asb_timeout_seconds,
        )
        response.raise_for_status()
        return {
            "status": "sent",
            "response": response.text[:500] if response.text else "",
        }
    except Exception as exc:
        return {
            "status": "dispatch_failed",
            "response": str(exc),
        }


def _build_message_hub_envelope(payload: Dict) -> Dict:
    title = payload.get("message_title") or payload.get("title") or payload.get("event_type", "notification")
    body = payload.get("message_body") or payload.get("body") or json.dumps(payload)
    return {
        "message_id": str(uuid4()),
        "source_app": settings.message_hub_source_app,
        "event_type": payload.get("event_type", "notification"),
        "user_id": payload.get("user_id"),
        "channel": payload.get("channel") or "common_api",
        "channel_target": payload.get("channel_target"),
        "title": title,
        "body": body,
        "payload": payload,
        "tags": {
            "provider": str(payload.get("provider", "")),
            "scheme": str(payload.get("scheme", "")),
        },
        "created_at_utc": payload.get("triggered_at_utc") or datetime.now(timezone.utc).isoformat(),
    }

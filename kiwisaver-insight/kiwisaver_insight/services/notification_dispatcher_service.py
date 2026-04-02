from __future__ import annotations

import json
from typing import Dict

import requests

from kiwisaver_insight.config import settings


def dispatch_alert_message(payload: Dict) -> Dict:
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

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class NotificationMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    source_app: str
    event_type: str = "notification"
    user_id: str | None = None
    channel: str = "common_api"
    channel_target: str | None = None
    title: str
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    tags: dict[str, str] = Field(default_factory=dict)
    created_at_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

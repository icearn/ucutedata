from __future__ import annotations

import json

from message_hub.config import settings
from message_hub.models import NotificationMessage


def publish_message(message: NotificationMessage) -> dict:
    from kafka import KafkaProducer

    producer = KafkaProducer(
        bootstrap_servers=[server.strip() for server in settings.kafka_bootstrap_servers.split(",") if server.strip()],
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
        linger_ms=25,
    )

    try:
        future = producer.send(settings.message_hub_topic, message.model_dump())
        metadata = future.get(timeout=10)
        producer.flush(timeout=10)
        return {
            "topic": metadata.topic,
            "partition": metadata.partition,
            "offset": metadata.offset,
            "message_id": message.message_id,
        }
    finally:
        producer.close(timeout=10)

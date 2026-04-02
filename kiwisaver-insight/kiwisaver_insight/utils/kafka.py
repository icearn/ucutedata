from __future__ import annotations

import json
from typing import Any, Dict


def publish_json_message(
    bootstrap_servers: str,
    topic: str,
    payload: Dict[str, Any],
    timeout_seconds: int = 10,
) -> Dict[str, Any]:
    from kafka import KafkaProducer

    producer = KafkaProducer(
        bootstrap_servers=[server.strip() for server in bootstrap_servers.split(",") if server.strip()],
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
        linger_ms=25,
    )

    try:
        future = producer.send(topic, payload)
        metadata = future.get(timeout=timeout_seconds)
        producer.flush(timeout=timeout_seconds)
        return {
            "topic": metadata.topic,
            "partition": metadata.partition,
            "offset": metadata.offset,
        }
    finally:
        producer.close(timeout=timeout_seconds)

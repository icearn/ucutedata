from __future__ import annotations

import json
from threading import Event
from time import sleep

from message_hub.config import settings
from message_hub.dispatcher import dispatch_message
from message_hub.models import NotificationMessage


def consume_forever(stop_event: Event):
    from kafka import KafkaConsumer

    consumer = None
    while not stop_event.is_set():
        try:
            consumer = KafkaConsumer(
                settings.message_hub_topic,
                bootstrap_servers=[server.strip() for server in settings.kafka_bootstrap_servers.split(",") if server.strip()],
                group_id=settings.consumer_group,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                value_deserializer=lambda value: json.loads(value.decode("utf-8")),
            )
            print("[message-hub] Kafka consumer connected", flush=True)
            break
        except Exception as exc:
            print(f"[message-hub] consumer startup failed, retrying: {exc}", flush=True)
            sleep(2)

    if consumer is None:
        return

    try:
        while not stop_event.is_set():
            records = consumer.poll(timeout_ms=settings.consumer_poll_ms)
            for partition_records in records.values():
                for record in partition_records:
                    message = NotificationMessage.model_validate(record.value)
                    results = dispatch_message(message)
                    print(
                        "[message-hub] delivery results",
                        json.dumps(
                            {
                                "message_id": message.message_id,
                                "source_app": message.source_app,
                                "results": results,
                            }
                        ),
                        flush=True,
                    )
    finally:
        consumer.close()

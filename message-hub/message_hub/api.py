from __future__ import annotations

from threading import Event, Thread

from fastapi import FastAPI

from message_hub.config import settings
from message_hub.consumer import consume_forever
from message_hub.dispatcher import describe_channels, dispatch_message
from message_hub.models import NotificationMessage
from message_hub.publisher import publish_message

app = FastAPI(
    title="Message Hub API",
    version="1.0.0",
    description="Kafka-backed shared notification delivery layer.",
)

_stop_event = Event()
_consumer_thread: Thread | None = None


@app.on_event("startup")
def on_startup():
    global _consumer_thread
    _stop_event.clear()
    if _consumer_thread is None or not _consumer_thread.is_alive():
        _consumer_thread = Thread(target=consume_forever, args=(_stop_event,), daemon=True, name="message-hub-consumer")
        _consumer_thread.start()


@app.on_event("shutdown")
def on_shutdown():
    _stop_event.set()
    if _consumer_thread and _consumer_thread.is_alive():
        _consumer_thread.join(timeout=5)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "kafka_bootstrap_servers": settings.kafka_bootstrap_servers,
        "topic": settings.message_hub_topic,
        "default_channels": settings.default_channels,
        "consumer_thread_alive": _consumer_thread.is_alive() if _consumer_thread else False,
    }


@app.get("/api/channels")
def get_channels():
    return describe_channels()


@app.post("/api/messages/publish")
def api_publish_message(message: NotificationMessage):
    return publish_message(message)


@app.post("/api/messages/dispatch")
def api_dispatch_message(message: NotificationMessage):
    return {"results": dispatch_message(message)}

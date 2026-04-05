from threading import Event
from types import SimpleNamespace

from message_hub import consumer


def test_consumer_skips_bad_records_and_continues(monkeypatch):
    stop_event = Event()
    dispatched = []

    class FakeConsumer:
        def __init__(self, *args, **kwargs):
            self.closed = False
            self.poll_count = 0

        def poll(self, timeout_ms=None):
            self.poll_count += 1
            if self.poll_count == 1:
                stop_event.set()
                return {
                    "partition-0": [
                        SimpleNamespace(value={"source_app": "kiwisaver-insight"}),
                        SimpleNamespace(
                            value={
                                "source_app": "kiwisaver-insight",
                                "event_type": "notification",
                                "title": "Valid",
                                "body": "Body",
                            }
                        ),
                    ]
                }
            return {}

        def close(self):
            self.closed = True

    fake_consumer = FakeConsumer()

    monkeypatch.setattr(
        consumer,
        "dispatch_message",
        lambda message: dispatched.append(message.title) or [{"channel": "console", "status": "sent"}],
    )
    monkeypatch.setitem(__import__("sys").modules, "kafka", SimpleNamespace(KafkaConsumer=lambda *args, **kwargs: fake_consumer))

    consumer.consume_forever(stop_event)

    assert dispatched == ["Valid"]
    assert fake_consumer.closed is True

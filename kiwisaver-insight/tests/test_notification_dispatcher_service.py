from kiwisaver_insight.services import notification_dispatcher_service


def test_dispatch_alert_message_publishes_to_message_hub(monkeypatch):
    captured = {}

    monkeypatch.setattr(notification_dispatcher_service.settings, "kafka_bootstrap_servers", "localhost:9094")
    monkeypatch.setattr(
        notification_dispatcher_service.settings,
        "message_hub_topic",
        "message-hub.notifications.v1",
    )
    monkeypatch.setattr(notification_dispatcher_service.settings, "alert_dispatch_webhook_url", None)
    def fake_publish(bootstrap_servers, topic, payload, timeout_seconds):
        captured["call"] = {
            "bootstrap_servers": bootstrap_servers,
            "topic": topic,
            "payload": payload,
            "timeout_seconds": timeout_seconds,
        }
        return {"topic": topic, "partition": 0, "offset": 12}

    monkeypatch.setattr(notification_dispatcher_service, "publish_json_message", fake_publish)

    result = notification_dispatcher_service.dispatch_alert_message(
        {
            "event_type": "kiwisaver_price_alert",
            "user_id": "user_123",
            "provider": "ASB",
            "scheme": "Growth Fund",
            "channel": "common_api",
            "message_title": "ASB alert",
            "message_body": "Growth Fund hit 3.5000",
        }
    )

    assert result["status"] == "queued_to_message_hub"
    assert captured["call"]["bootstrap_servers"] == "localhost:9094"
    assert captured["call"]["topic"] == "message-hub.notifications.v1"
    assert captured["call"]["payload"]["source_app"] == "kiwisaver-insight"
    assert captured["call"]["payload"]["channel"] == "common_api"
    assert captured["call"]["payload"]["title"] == "ASB alert"


def test_dispatch_alert_message_falls_back_to_pending_without_kafka_or_webhook(monkeypatch):
    monkeypatch.setattr(notification_dispatcher_service.settings, "kafka_bootstrap_servers", "")
    monkeypatch.setattr(notification_dispatcher_service.settings, "alert_dispatch_webhook_url", None)

    result = notification_dispatcher_service.dispatch_alert_message(
        {
            "event_type": "kiwisaver_price_alert",
            "message_title": "ASB alert",
            "message_body": "Growth Fund hit 3.5000",
        }
    )

    assert result == {
        "status": "pending_channel",
        "response": "ALERT_DISPATCH_WEBHOOK_URL is not configured.",
    }

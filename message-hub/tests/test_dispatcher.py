from message_hub import dispatcher
from message_hub.models import NotificationMessage


def test_common_api_routes_to_default_channels(monkeypatch):
    monkeypatch.setattr(dispatcher.settings, "default_channels_raw", "console,email")

    channels = dispatcher._resolve_channels("common_api")

    assert channels == ["console", "email"]


def test_console_dispatch_succeeds():
    message = NotificationMessage(
        source_app="kiwisaver-insight",
        event_type="kiwisaver_price_alert",
        channel="console",
        title="Test alert",
        body="Body",
    )

    results = dispatcher.dispatch_message(message)

    assert results == [{"channel": "console", "status": "sent", "response": "Logged to stdout"}]


def test_email_dispatch_requires_smtp(monkeypatch):
    monkeypatch.setattr(dispatcher.settings, "smtp_host", None)
    monkeypatch.setattr(dispatcher.settings, "smtp_from_email", None)
    message = NotificationMessage(
        source_app="kiwisaver-insight",
        event_type="kiwisaver_price_alert",
        channel="email",
        channel_target="user@example.com",
        title="Test alert",
        body="Body",
    )

    results = dispatcher.dispatch_message(message)

    assert results[0]["status"] == "not_configured"


def test_dispatch_message_captures_channel_errors_and_continues(monkeypatch):
    monkeypatch.setattr(dispatcher, "_resolve_channels", lambda _: ["slack", "console"])
    monkeypatch.setattr(dispatcher, "_dispatch_slack", lambda message: (_ for _ in ()).throw(RuntimeError("slack down")))

    message = NotificationMessage(
        source_app="kiwisaver-insight",
        event_type="kiwisaver_price_alert",
        channel="common_api",
        title="Test alert",
        body="Body",
    )

    results = dispatcher.dispatch_message(message)

    assert results[0]["channel"] == "slack"
    assert results[0]["status"] == "failed"
    assert "slack down" in results[0]["response"]
    assert results[1] == {"channel": "console", "status": "sent", "response": "Logged to stdout"}

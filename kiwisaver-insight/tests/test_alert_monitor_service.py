from datetime import date, datetime, timezone

from kiwisaver_insight.services import alert_monitor_service


def test_create_alert_rule_uses_latest_reference_price_for_percent_change(monkeypatch):
    captured = {}

    monkeypatch.setattr(alert_monitor_service, "ensure_runtime_schema", lambda: None)
    monkeypatch.setattr(
        alert_monitor_service,
        "_resolve_reference_price",
        lambda provider, scheme: {
            "scheme": scheme,
            "unit_price": 1.2345,
            "date": date(2026, 4, 1),
        },
    )
    monkeypatch.setattr(
        alert_monitor_service,
        "_insert_alert_rule",
        lambda record: captured.setdefault("record", record) or record,
    )

    result = alert_monitor_service.create_alert_rule(
        {
            "user_id": "user_123",
            "provider": "ASB",
            "scheme": "Growth Fund",
            "metric": "percent_change",
            "comparison": "gte",
            "target_value": 5.0,
            "channel": "common_api",
            "trigger_once": True,
        }
    )

    assert captured["record"]["reference_price"] == 1.2345
    assert result["metric"] == "percent_change"
    assert result["scheme"] == "Growth Fund"


def test_evaluate_active_alerts_triggers_matching_rule(monkeypatch):
    now = datetime(2026, 4, 1, tzinfo=timezone.utc)
    rule_row = {
        "id": 7,
        "user_id": "user_123",
        "provider": "ASB",
        "scheme": "Growth Fund",
        "metric": "unit_price",
        "comparison": "gte",
        "target_value": 1.25,
        "reference_price": None,
        "label": "Take Profit",
        "channel": "common_api",
        "channel_target": None,
        "is_active": True,
        "trigger_once": True,
        "triggered_at": None,
        "last_notified_price_date": None,
        "last_checked_price_date": None,
        "last_checked_value": None,
        "created_at": now,
        "updated_at": now,
    }
    check_calls = []
    notify_calls = []

    monkeypatch.setattr(alert_monitor_service, "ensure_runtime_schema", lambda: None)
    monkeypatch.setattr(alert_monitor_service, "_query_alert_rules", lambda **kwargs: [rule_row])
    monkeypatch.setattr(
        alert_monitor_service,
        "fetch_latest_price",
        lambda provider, scheme: {
            "scheme": scheme,
            "unit_price": 1.2601,
            "date": date(2026, 4, 1),
        },
    )
    monkeypatch.setattr(
        alert_monitor_service,
        "_update_alert_rule_check",
        lambda rule_id, latest_price_date, observed_value: check_calls.append(
            (rule_id, latest_price_date, observed_value)
        ),
    )
    monkeypatch.setattr(
        alert_monitor_service,
        "dispatch_alert_message",
        lambda payload: {"status": "pending_channel", "response": "No webhook configured"},
    )
    monkeypatch.setattr(
        alert_monitor_service,
        "_insert_alert_event",
        lambda event: {
            "id": 99,
            "rule_id": event["rule_id"],
            "user_id": event["user_id"],
            "provider": event["provider"],
            "scheme": event["scheme"],
            "price_date": event["price_date"].isoformat(),
            "observed_unit_price": event["observed_unit_price"],
            "observed_value": event["observed_value"],
            "message_title": event["message_title"],
            "message_body": event["message_body"],
            "channel": event["channel"],
            "channel_target": event["channel_target"],
            "dispatch_status": event["dispatch_status"],
            "dispatch_response": event["dispatch_response"],
            "created_at": now.isoformat(),
        },
    )
    monkeypatch.setattr(
        alert_monitor_service,
        "_mark_alert_notified",
        lambda rule_id, price_date, mark_triggered: notify_calls.append((rule_id, price_date, mark_triggered)),
    )

    result = alert_monitor_service.evaluate_active_alerts()

    assert result["checked_rules"] == 1
    assert result["matched_rules"] == 1
    assert result["triggered_events_count"] == 1
    assert result["errors"] == []
    assert check_calls == [(7, date(2026, 4, 1), 1.2601)]
    assert notify_calls == [(7, date(2026, 4, 1), True)]
    assert result["triggered_events"][0]["dispatch_status"] == "pending_channel"


def test_evaluate_active_alerts_skips_duplicate_notification_for_same_price_date(monkeypatch):
    now = datetime(2026, 4, 1, tzinfo=timezone.utc)
    rule_row = {
        "id": 8,
        "user_id": "user_123",
        "provider": "ASB",
        "scheme": "Aggressive Fund",
        "metric": "percent_change",
        "comparison": "lte",
        "target_value": -2.0,
        "reference_price": 1.3,
        "label": None,
        "channel": "common_api",
        "channel_target": None,
        "is_active": True,
        "trigger_once": False,
        "triggered_at": None,
        "last_notified_price_date": date(2026, 4, 1),
        "last_checked_price_date": None,
        "last_checked_value": None,
        "created_at": now,
        "updated_at": now,
    }

    dispatch_calls = []

    monkeypatch.setattr(alert_monitor_service, "ensure_runtime_schema", lambda: None)
    monkeypatch.setattr(alert_monitor_service, "_query_alert_rules", lambda **kwargs: [rule_row])
    monkeypatch.setattr(
        alert_monitor_service,
        "fetch_latest_price",
        lambda provider, scheme: {
            "scheme": scheme,
            "unit_price": 1.25,
            "date": date(2026, 4, 1),
        },
    )
    monkeypatch.setattr(alert_monitor_service, "_update_alert_rule_check", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        alert_monitor_service,
        "dispatch_alert_message",
        lambda payload: dispatch_calls.append(payload) or {"status": "sent", "response": "ok"},
    )

    result = alert_monitor_service.evaluate_active_alerts()

    assert result["checked_rules"] == 1
    assert result["matched_rules"] == 1
    assert result["triggered_events_count"] == 0
    assert dispatch_calls == []

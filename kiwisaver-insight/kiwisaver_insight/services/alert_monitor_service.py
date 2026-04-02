from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from psycopg2.extras import RealDictCursor

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services.asb_service import current_price_changes
from kiwisaver_insight.services.notification_dispatcher_service import dispatch_alert_message
from kiwisaver_insight.utils.db import ensure_runtime_schema, fetch_latest_price, get_conn

VALID_METRICS = {"unit_price", "percent_change"}
VALID_COMPARISONS = {"gte", "lte", "eq"}
TRACKED_SCHEMES = {(scheme.provider, scheme.scheme): scheme for scheme in list_tracked_schemes()}


def create_alert_rule(payload: Dict) -> Dict:
    ensure_runtime_schema()

    provider = payload["provider"]
    scheme = payload["scheme"]
    metric = payload["metric"]
    comparison = payload["comparison"]
    _validate_rule_shape(provider, scheme, metric, comparison)

    reference_price = payload.get("reference_price")
    if metric == "percent_change" and reference_price is None:
        latest_price = _resolve_reference_price(provider, scheme)
        if latest_price is None:
            raise ValueError(f"Unable to determine a reference price for {provider} {scheme}")
        reference_price = latest_price["unit_price"]

    record = {
        "user_id": payload["user_id"],
        "provider": provider,
        "scheme": scheme,
        "metric": metric,
        "comparison": comparison,
        "target_value": payload["target_value"],
        "reference_price": reference_price,
        "label": payload.get("label"),
        "channel": payload.get("channel") or "common_api",
        "channel_target": payload.get("channel_target"),
        "trigger_once": payload.get("trigger_once", True),
    }
    return _insert_alert_rule(record)


def list_alert_rules(user_id: str | None = None, active_only: bool | None = None) -> List[Dict]:
    ensure_runtime_schema()
    return [_serialise_rule(row) for row in _query_alert_rules(user_id=user_id, active_only=active_only)]


def list_alert_events(user_id: str | None = None, rule_id: int | None = None, limit: int = 100) -> List[Dict]:
    ensure_runtime_schema()
    query = [
        "SELECT id, rule_id, user_id, provider, scheme, price_date, observed_unit_price, observed_value,",
        "message_title, message_body, channel, channel_target, dispatch_status, dispatch_response, created_at",
        "FROM kiwisaver_alert_events",
        "WHERE 1=1",
    ]
    params: List = []

    if user_id:
        query.append("AND user_id = %s")
        params.append(user_id)
    if rule_id is not None:
        query.append("AND rule_id = %s")
        params.append(rule_id)

    query.append("ORDER BY created_at DESC")
    query.append("LIMIT %s")
    params.append(limit)

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(" ".join(query), params)
            rows = cur.fetchall()
    return [_serialise_event(row) for row in rows]


def disable_alert_rule(rule_id: int) -> Dict:
    ensure_runtime_schema()
    sql = """
        UPDATE kiwisaver_alert_rules
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = %s
        RETURNING *
    """
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (rule_id,))
            row = cur.fetchone()
        conn.commit()

    if row is None:
        raise ValueError(f"Alert rule {rule_id} was not found")
    return _serialise_rule(row)


def evaluate_active_alerts() -> Dict:
    ensure_runtime_schema()

    rules = _query_alert_rules(active_only=True)
    triggered_events: List[Dict] = []
    errors: List[Dict] = []
    checked_rules = 0
    matched_rules = 0

    for rule in rules:
        latest_price = fetch_latest_price(rule["provider"], rule["scheme"])
        if latest_price is None:
            continue

        try:
            checked_rules += 1
            observed_value = _calculate_observed_value(rule, float(latest_price["unit_price"]))
            _update_alert_rule_check(rule["id"], latest_price["date"], observed_value)

            if not _rule_matches(rule, observed_value):
                continue

            matched_rules += 1
            latest_price_date = latest_price["date"]
            if rule["trigger_once"] and rule["triggered_at"] is not None:
                continue
            if rule["last_notified_price_date"] == latest_price_date:
                continue

            title, body = _build_alert_message(rule, latest_price, observed_value)
            payload = {
                "event_type": "kiwisaver_price_alert",
                "rule_id": rule["id"],
                "user_id": rule["user_id"],
                "provider": rule["provider"],
                "scheme": rule["scheme"],
                "metric": rule["metric"],
                "comparison": rule["comparison"],
                "target_value": float(rule["target_value"]),
                "reference_price": float(rule["reference_price"]) if rule["reference_price"] is not None else None,
                "price_date": latest_price_date.isoformat(),
                "observed_unit_price": float(latest_price["unit_price"]),
                "observed_value": observed_value,
                "channel": rule["channel"],
                "channel_target": rule["channel_target"],
                "message_title": title,
                "message_body": body,
                "triggered_at_utc": datetime.now(timezone.utc).isoformat(),
            }
            dispatch = dispatch_alert_message(payload)
            event = _insert_alert_event(
                {
                    "rule_id": rule["id"],
                    "user_id": rule["user_id"],
                    "provider": rule["provider"],
                    "scheme": rule["scheme"],
                    "price_date": latest_price_date,
                    "observed_unit_price": float(latest_price["unit_price"]),
                    "observed_value": observed_value,
                    "message_title": title,
                    "message_body": body,
                    "channel": rule["channel"],
                    "channel_target": rule["channel_target"],
                    "dispatch_status": dispatch["status"],
                    "dispatch_response": dispatch["response"],
                }
            )
            _mark_alert_notified(
                rule_id=rule["id"],
                price_date=latest_price_date,
                mark_triggered=dispatch["status"] != "dispatch_failed" and rule["trigger_once"],
            )
            triggered_events.append(event)
        except Exception as exc:
            errors.append(
                {
                    "rule_id": rule["id"],
                    "provider": rule["provider"],
                    "scheme": rule["scheme"],
                    "error": str(exc),
                }
            )

    return {
        "checked_rules": checked_rules,
        "matched_rules": matched_rules,
        "triggered_events_count": len(triggered_events),
        "triggered_events": triggered_events,
        "errors": errors,
    }


def _validate_rule_shape(provider: str, scheme: str, metric: str, comparison: str):
    if (provider, scheme) not in TRACKED_SCHEMES:
        raise ValueError(f"{provider} {scheme} is not part of the tracked KiwiSaver scheme set")
    if metric not in VALID_METRICS:
        raise ValueError(f"metric must be one of {sorted(VALID_METRICS)}")
    if comparison not in VALID_COMPARISONS:
        raise ValueError(f"comparison must be one of {sorted(VALID_COMPARISONS)}")


def _resolve_reference_price(provider: str, scheme: str) -> Optional[Dict]:
    stored = fetch_latest_price(provider, scheme)
    if stored is not None:
        return stored

    if provider == "ASB":
        latest = current_price_changes(lookback_days=14, store=False)
        fund = next((item for item in latest["funds"] if item["scheme"] == scheme), None)
        if fund:
            return {
                "scheme": scheme,
                "unit_price": fund["current_unit_price"],
                "date": date.fromisoformat(latest["latest_price_date"]),
            }
        return None

    if provider == "ANZ":
        return _latest_row_for_scheme(ANZCrawler().fetch_prices(), scheme)

    if provider == "Westpac":
        return _latest_row_for_scheme(WestpacCrawler().fetch_prices(), scheme)

    return None


def _latest_row_for_scheme(rows: List[Dict], scheme: str) -> Optional[Dict]:
    filtered = [row for row in rows if row["scheme"] == scheme]
    if not filtered:
        return None
    return max(filtered, key=lambda row: row["date"])


def _calculate_observed_value(rule: Dict, current_unit_price: float) -> float:
    if rule["metric"] == "unit_price":
        return round(current_unit_price, 6)

    reference_price = rule.get("reference_price")
    if reference_price in (None, 0):
        raise ValueError("percent_change alerts require a non-zero reference_price")
    return round(((current_unit_price - float(reference_price)) / float(reference_price)) * 100, 6)


def _rule_matches(rule: Dict, observed_value: float) -> bool:
    target_value = float(rule["target_value"])
    comparison = rule["comparison"]

    if comparison == "gte":
        return observed_value >= target_value
    if comparison == "lte":
        return observed_value <= target_value
    return abs(observed_value - target_value) <= settings.alert_exact_tolerance


def _build_alert_message(rule: Dict, latest_price: Dict, observed_value: float) -> tuple[str, str]:
    scheme_meta = TRACKED_SCHEMES[(rule["provider"], rule["scheme"])]
    label_prefix = f"{rule['label']}: " if rule.get("label") else ""
    target_text = _format_target(rule)

    if rule["metric"] == "unit_price":
        title = f"{label_prefix}{scheme_meta.display_name} hit {float(latest_price['unit_price']):.4f}"
        body = (
            f"{scheme_meta.display_name} closed at {float(latest_price['unit_price']):.4f} on "
            f"{latest_price['date'].isoformat()}, meeting alert condition {target_text}."
        )
        return title, body

    title = f"{label_prefix}{scheme_meta.display_name} moved {observed_value:.4f}%"
    body = (
        f"{scheme_meta.display_name} moved {observed_value:.4f}% from reference price "
        f"{float(rule['reference_price']):.4f} to {float(latest_price['unit_price']):.4f} on "
        f"{latest_price['date'].isoformat()}, meeting alert condition {target_text}."
    )
    return title, body


def _format_target(rule: Dict) -> str:
    operator = {"gte": ">=", "lte": "<=", "eq": "="}[rule["comparison"]]
    suffix = "%" if rule["metric"] == "percent_change" else ""
    return f"{operator} {float(rule['target_value']):.4f}{suffix}"


def _insert_alert_rule(record: Dict) -> Dict:
    sql = """
        INSERT INTO kiwisaver_alert_rules (
            user_id, provider, scheme, metric, comparison, target_value, reference_price, label,
            channel, channel_target, trigger_once
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    values = (
        record["user_id"],
        record["provider"],
        record["scheme"],
        record["metric"],
        record["comparison"],
        Decimal(str(record["target_value"])),
        Decimal(str(record["reference_price"])) if record["reference_price"] is not None else None,
        record["label"],
        record["channel"],
        record["channel_target"],
        record["trigger_once"],
    )

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, values)
            row = cur.fetchone()
        conn.commit()
    return _serialise_rule(row)


def _query_alert_rules(user_id: str | None = None, active_only: bool | None = None) -> List[Dict]:
    query = [
        "SELECT *",
        "FROM kiwisaver_alert_rules",
        "WHERE 1=1",
    ]
    params: List = []

    if user_id:
        query.append("AND user_id = %s")
        params.append(user_id)
    if active_only is True:
        query.append("AND is_active = TRUE")
    elif active_only is False:
        query.append("AND is_active = FALSE")

    query.append("ORDER BY created_at DESC")
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(" ".join(query), params)
            rows = cur.fetchall()
    return rows


def _update_alert_rule_check(rule_id: int, latest_price_date: date, observed_value: float):
    sql = """
        UPDATE kiwisaver_alert_rules
        SET last_checked_price_date = %s,
            last_checked_value = %s,
            updated_at = NOW()
        WHERE id = %s
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (latest_price_date, Decimal(str(observed_value)), rule_id))
        conn.commit()


def _mark_alert_notified(rule_id: int, price_date: date, mark_triggered: bool):
    if mark_triggered:
        sql = """
            UPDATE kiwisaver_alert_rules
            SET last_notified_price_date = %s,
                triggered_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """
    else:
        sql = """
            UPDATE kiwisaver_alert_rules
            SET last_notified_price_date = %s,
                updated_at = NOW()
            WHERE id = %s
        """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (price_date, rule_id))
        conn.commit()


def _insert_alert_event(event: Dict) -> Dict:
    sql = """
        INSERT INTO kiwisaver_alert_events (
            rule_id, user_id, provider, scheme, price_date, observed_unit_price, observed_value,
            message_title, message_body, channel, channel_target, dispatch_status, dispatch_response
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, rule_id, user_id, provider, scheme, price_date, observed_unit_price, observed_value,
                  message_title, message_body, channel, channel_target, dispatch_status, dispatch_response, created_at
    """
    values = (
        event["rule_id"],
        event["user_id"],
        event["provider"],
        event["scheme"],
        event["price_date"],
        Decimal(str(event["observed_unit_price"])),
        Decimal(str(event["observed_value"])),
        event["message_title"],
        event["message_body"],
        event["channel"],
        event["channel_target"],
        event["dispatch_status"],
        event["dispatch_response"],
    )

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, values)
            row = cur.fetchone()
        conn.commit()
    return _serialise_event(row)


def _serialise_rule(row: Dict) -> Dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "provider": row["provider"],
        "scheme": row["scheme"],
        "metric": row["metric"],
        "comparison": row["comparison"],
        "target_value": float(row["target_value"]),
        "reference_price": float(row["reference_price"]) if row["reference_price"] is not None else None,
        "label": row["label"],
        "channel": row["channel"],
        "channel_target": row["channel_target"],
        "is_active": row["is_active"],
        "trigger_once": row["trigger_once"],
        "triggered_at": row["triggered_at"].isoformat() if row["triggered_at"] else None,
        "last_notified_price_date": row["last_notified_price_date"].isoformat()
        if row["last_notified_price_date"]
        else None,
        "last_checked_price_date": row["last_checked_price_date"].isoformat()
        if row["last_checked_price_date"]
        else None,
        "last_checked_value": float(row["last_checked_value"]) if row["last_checked_value"] is not None else None,
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


def _serialise_event(row: Dict) -> Dict:
    return {
        "id": row["id"],
        "rule_id": row["rule_id"],
        "user_id": row["user_id"],
        "provider": row["provider"],
        "scheme": row["scheme"],
        "price_date": row["price_date"].isoformat(),
        "observed_unit_price": float(row["observed_unit_price"]),
        "observed_value": float(row["observed_value"]),
        "message_title": row["message_title"],
        "message_body": row["message_body"],
        "channel": row["channel"],
        "channel_target": row["channel_target"],
        "dispatch_status": row["dispatch_status"],
        "dispatch_response": row["dispatch_response"],
        "created_at": row["created_at"].isoformat(),
    }

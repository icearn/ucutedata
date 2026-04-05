from __future__ import annotations

from contextlib import contextmanager
from datetime import date
from decimal import Decimal
import json
from typing import Dict, Iterable, List, Optional

import psycopg2
from psycopg2.extras import Json, execute_values

from kiwisaver_insight.config import settings

DB_CONFIG = {
    "dbname": settings.db_name,
    "user": settings.db_user,
    "password": settings.db_password,
    "host": settings.db_host,
    "port": settings.db_port,
}

RUNTIME_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS kiwisaver_unit_prices (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, scheme, price_date)
);

CREATE TABLE IF NOT EXISTS kiwisaver_alert_rules (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    metric TEXT NOT NULL,
    comparison TEXT NOT NULL,
    target_value NUMERIC(18,6) NOT NULL,
    reference_price NUMERIC(18,6),
    label TEXT,
    channel TEXT NOT NULL DEFAULT 'common_api',
    channel_target TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_once BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    last_notified_price_date DATE,
    last_checked_price_date DATE,
    last_checked_value NUMERIC(18,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiwisaver_alert_rules_active
    ON kiwisaver_alert_rules (is_active, provider, scheme);

CREATE TABLE IF NOT EXISTS kiwisaver_alert_events (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES kiwisaver_alert_rules(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    price_date DATE NOT NULL,
    observed_unit_price NUMERIC(18,6) NOT NULL,
    observed_value NUMERIC(18,6) NOT NULL,
    message_title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    channel TEXT NOT NULL,
    channel_target TEXT,
    dispatch_status TEXT NOT NULL,
    dispatch_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiwisaver_alert_events_rule_id
    ON kiwisaver_alert_events (rule_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kiwisaver_strategy_recommendations (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    selected_scheme TEXT NOT NULL,
    provider TEXT NOT NULL,
    risk_preference TEXT NOT NULL,
    objective TEXT NOT NULL,
    recommended_strategy_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiwisaver_strategy_recommendations_lookup
    ON kiwisaver_strategy_recommendations (user_id, selected_scheme, created_at DESC);
"""


@contextmanager
def get_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()


def ensure_runtime_schema():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(RUNTIME_SCHEMA_SQL)
        conn.commit()


def insert_unit_prices(provider: str, prices: Iterable[Dict]):
    prices = list(prices)
    if not prices:
        print("[DB] No prices to insert.")
        return

    rows = [
        (
            provider,
            row["scheme"],
            Decimal(str(row["unit_price"])),
            row["date"],
        )
        for row in prices
    ]

    sql = """
        INSERT INTO kiwisaver_unit_prices (provider, scheme, unit_price, price_date)
        VALUES %s
        ON CONFLICT (provider, scheme, price_date) DO NOTHING;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows)
        conn.commit()
    print(f"[DB] Inserted {len(rows)} records for {provider}.")


def fetch_prices(
    provider: str,
    scheme: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[Dict]:
    query = [
        "SELECT scheme, unit_price, price_date",
        "FROM kiwisaver_unit_prices",
        "WHERE provider = %s",
    ]
    params: List = [provider]

    if scheme:
        query.append("AND scheme = %s")
        params.append(scheme)
    if start_date:
        query.append("AND price_date >= %s")
        params.append(start_date)
    if end_date:
        query.append("AND price_date <= %s")
        params.append(end_date)

    query.append("ORDER BY price_date ASC")
    sql = " ".join(query)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {
            "scheme": row[0],
            "unit_price": float(row[1]),
            "date": row[2],
        }
        for row in rows
    ]


def list_schemes(provider: str) -> List[str]:
    sql = "SELECT DISTINCT scheme FROM kiwisaver_unit_prices WHERE provider = %s ORDER BY 1"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (provider,))
            rows = cur.fetchall()
    return [row[0] for row in rows]


def fetch_latest_price(provider: str, scheme: str) -> Optional[Dict]:
    sql = """
        SELECT scheme, unit_price, price_date
        FROM kiwisaver_unit_prices
        WHERE provider = %s AND scheme = %s
        ORDER BY price_date DESC
        LIMIT 1
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (provider, scheme))
            row = cur.fetchone()

    if not row:
        return None

    return {
        "scheme": row[0],
        "unit_price": float(row[1]),
        "date": row[2],
    }


def fetch_latest_price_date(provider: str, scheme: Optional[str] = None) -> Optional[date]:
    query = [
        "SELECT MAX(price_date)",
        "FROM kiwisaver_unit_prices",
        "WHERE provider = %s",
    ]
    params: List = [provider]

    if scheme:
        query.append("AND scheme = %s")
        params.append(scheme)

    sql = " ".join(query)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()

    latest_date = row[0] if row else None
    return latest_date if latest_date is not None else None


def insert_strategy_recommendation(
    user_id: Optional[str],
    selected_scheme: str,
    provider: str,
    risk_preference: str,
    objective: str,
    recommended_strategy_id: str,
    payload: Dict,
) -> Dict:
    sql = """
        INSERT INTO kiwisaver_strategy_recommendations (
            user_id,
            selected_scheme,
            provider,
            risk_preference,
            objective,
            recommended_strategy_id,
            payload
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, created_at
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    user_id,
                    selected_scheme,
                    provider,
                    risk_preference,
                    objective,
                    recommended_strategy_id,
                    Json(payload),
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "id": row[0],
        "created_at": row[1].isoformat(),
    }


def fetch_latest_strategy_recommendation(user_id: str, selected_scheme: Optional[str] = None) -> Optional[Dict]:
    query = [
        "SELECT id, payload, created_at",
        "FROM kiwisaver_strategy_recommendations",
        "WHERE user_id = %s",
    ]
    params: List = [user_id]

    if selected_scheme:
        query.append("AND selected_scheme = %s")
        params.append(selected_scheme)

    query.append("ORDER BY created_at DESC")
    query.append("LIMIT 1")

    sql = " ".join(query)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()

    if not row:
        return None

    payload = row[1]
    if isinstance(payload, str):
        payload = json.loads(payload)
    payload["recommendation_record"] = {
        "id": row[0],
        "created_at": row[2].isoformat(),
    }
    return payload

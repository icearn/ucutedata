from __future__ import annotations

from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from typing import Dict, Iterable, List, Optional

import psycopg2
from psycopg2.extras import execute_values

from kiwisaver_insight.config import settings

DB_CONFIG = {
    "dbname": settings.db_name,
    "user": settings.db_user,
    "password": settings.db_password,
    "host": settings.db_host,
    "port": settings.db_port,
}


@contextmanager
def get_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()


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

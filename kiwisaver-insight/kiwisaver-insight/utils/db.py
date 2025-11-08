# utils/db.py
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict
import os

# Load from env or default
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "kiwisaver"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

def insert_unit_prices(provider: str, prices: List[Dict]):
    if not prices:
        print("[DB] No prices to insert.")
        return

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            values = [
                (
                    provider,
                    row["scheme"],
                    float(row["unit_price"]),
                    row["date"]
                ) for row in prices
            ]

            sql = """
                INSERT INTO kiwisaver_unit_prices (provider, scheme, unit_price, price_date)
                VALUES %s
                ON CONFLICT (provider, scheme, price_date) DO NOTHING;
            """
            execute_values(cur, sql, values)
        conn.commit()
    print(f"[DB] Inserted {len(values)} records for {provider}.")

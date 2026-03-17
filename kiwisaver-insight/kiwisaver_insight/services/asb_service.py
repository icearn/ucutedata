from __future__ import annotations

import base64
import io
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Sequence

import matplotlib

# Use non-GUI backend for container environments before pyplot import
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.asb import ASBCrawler
from kiwisaver_insight.utils.db import fetch_prices, insert_unit_prices, list_schemes


@dataclass
class TrendSeries:
    scheme: str
    points: List[Dict]


crawler = ASBCrawler()


def daterange(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def fetch_history(start: date, end: date, store: bool = False) -> List[Dict]:
    if start > end:
        raise ValueError("start date must be before end date")

    collected: List[Dict] = []
    for single_date in daterange(start, end):
        day_rows = crawler.fetch_prices(single_date)
        collected.extend(day_rows)
        if settings.asb_history_backoff_seconds:
            time.sleep(settings.asb_history_backoff_seconds)

    if store and collected:
        insert_unit_prices(crawler.provider, collected)

    # Normalise dates to ISO for API consumers
    return [
        {**row, "date": row["date"].isoformat() if isinstance(row["date"], date) else row["date"]}
        for row in collected
    ]


def ensure_history(start: date, end: date, min_points: int = 2):
    """Ensure we have at least `min_points` data rows in the DB for the interval."""

    existing = fetch_prices(crawler.provider, start_date=start, end_date=end)
    if len(existing) >= min_points:
        return existing

    missing_data = fetch_history(start, end, store=True)
    return fetch_prices(crawler.provider, start_date=start, end_date=end) if missing_data else existing


def trend_series(
    start: date,
    end: date,
    schemes: Sequence[str] | None = None,
    ensure_fresh: bool = True,
) -> List[TrendSeries]:
    if ensure_fresh:
        ensure_history(start, end)

    if not schemes:
        schemes = list_schemes(crawler.provider)

    series: List[TrendSeries] = []
    for scheme in schemes:
        rows = fetch_prices(crawler.provider, scheme=scheme, start_date=start, end_date=end)
        if not rows:
            continue
        series.append(
            TrendSeries(
                scheme=scheme,
                points=[
                    {
                        "date": r["date"].isoformat() if isinstance(r["date"], date) else str(r["date"]),
                        "unit_price": r["unit_price"],
                    }
                    for r in rows
                ],
            )
        )
    return series


def generate_trend_chart(series: List[TrendSeries], metric: str = "unit_price") -> str:
    if not series:
        raise ValueError("No trend series available to chart")

    plt.figure(figsize=(settings.trend_chart_width, settings.trend_chart_height))
    for ts in series:
        dates = [datetime.fromisoformat(p["date"]) for p in ts.points]
        values = [p.get(metric, p.get("unit_price")) for p in ts.points]
        plt.plot(dates, values, label=ts.scheme)

    plt.title(f"ASB KiwiSaver {metric.replace('_', ' ').title()} Trend")
    plt.xlabel("Date")
    plt.ylabel(metric.replace("_", " ").title())
    plt.legend()
    plt.grid(True, linestyle="--", alpha=0.3)

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png")
    plt.close()

    return base64.b64encode(buf.getvalue()).decode("ascii")


def calculate_returns(
    schemes: Sequence[str],
    start: date,
    end: date,
    initial_amount: float,
) -> Dict:
    if start >= end:
        raise ValueError("End date must be after start date")

    ensure_history(start, end)

    comparison = {}
    plot_series: List[TrendSeries] = []
    for scheme in schemes:
        rows = fetch_prices(crawler.provider, scheme=scheme, start_date=start, end_date=end)
        if len(rows) < 2:
            continue
        base_price = rows[0]["unit_price"]
        table = []
        for row in rows:
            growth = row["unit_price"] / base_price
            value = initial_amount * growth
            table.append(
                {
                    "date": row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"]),
                    "unit_price": row["unit_price"],
                    "portfolio_value": round(value, 2),
                    "return_pct": round((growth - 1) * 100, 4),
                }
            )
        final_value = table[-1]["portfolio_value"]
        comparison[scheme] = {
            "initial_amount": initial_amount,
            "final_amount": final_value,
            "total_return_pct": round(((final_value / initial_amount) - 1) * 100, 4),
            "table": table,
        }
        plot_series.append(
            TrendSeries(
                scheme=scheme,
                points=[
                    {
                        "date": row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"]),
                        "portfolio_value": entry["portfolio_value"],
                    }
                    for row, entry in zip(rows, table)
                ],
            )
        )

    chart_b64 = generate_trend_chart(plot_series, metric="portfolio_value") if plot_series else None
    return {"comparison": comparison, "chart": chart_b64}

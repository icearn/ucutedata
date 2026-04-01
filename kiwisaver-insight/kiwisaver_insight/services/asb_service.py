from __future__ import annotations

import base64
import io
import time
from collections import OrderedDict
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


def _snapshot_signature(rows: Sequence[Dict]) -> tuple[tuple[str, float], ...]:
    return tuple(
        (row["scheme"], round(float(row["unit_price"]), 6))
        for row in sorted(rows, key=lambda item: item["scheme"])
    )


def _serialise_rows(rows: Sequence[Dict]) -> List[Dict]:
    return [
        {**row, "date": row["date"].isoformat() if isinstance(row["date"], date) else row["date"]}
        for row in rows
    ]


def _fetch_unique_history_rows(start: date, end: date) -> List[Dict]:
    """
    ASB serves the latest available snapshot for weekends and future dates.
    Keep only the first day on which a new snapshot appears inside the range.
    """

    collected: List[Dict] = []
    last_signature: tuple[tuple[str, float], ...] | None = None

    for single_date in daterange(start, end):
        day_rows = crawler.fetch_prices(single_date)
        if not day_rows:
            continue

        signature = _snapshot_signature(day_rows)
        if signature == last_signature:
            if settings.asb_history_backoff_seconds:
                time.sleep(settings.asb_history_backoff_seconds)
            continue

        collected.extend([{**row, "date": single_date} for row in day_rows])
        last_signature = signature

        if settings.asb_history_backoff_seconds:
            time.sleep(settings.asb_history_backoff_seconds)

    return collected


def fetch_history(start: date, end: date, store: bool = False) -> List[Dict]:
    if start > end:
        raise ValueError("start date must be before end date")

    collected = _fetch_unique_history_rows(start, end)

    if store and collected:
        insert_unit_prices(crawler.provider, collected)

    return _serialise_rows(collected)


def ensure_history(start: date, end: date, min_points: int = 2):
    """Ensure the requested interval is covered in the DB before charting or analysis."""

    existing = fetch_prices(crawler.provider, start_date=start, end_date=end)
    if _covers_interval(existing, start, end, min_points=min_points):
        return existing

    for missing_start, missing_end in _missing_intervals(existing, start, end):
        fetch_history(missing_start, missing_end, store=True)

    if len(existing) < min_points:
        fetch_history(start, end, store=True)

    refreshed = fetch_prices(crawler.provider, start_date=start, end_date=end)
    return refreshed if refreshed else existing


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


def _covers_interval(rows: Sequence[Dict], start: date, end: date, min_points: int = 2) -> bool:
    if len(rows) < min_points:
        return False

    first_date = rows[0]["date"]
    last_date = rows[-1]["date"]
    return first_date <= start and last_date >= end


def _missing_intervals(rows: Sequence[Dict], start: date, end: date) -> List[tuple[date, date]]:
    if not rows:
        return [(start, end)]

    missing: List[tuple[date, date]] = []
    first_date = rows[0]["date"]
    last_date = rows[-1]["date"]

    if first_date > start:
        missing.append((start, first_date - timedelta(days=1)))
    if last_date < end:
        missing.append((last_date + timedelta(days=1), end))

    return [interval for interval in missing if interval[0] <= interval[1]]


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


def current_price_changes(lookback_days: int = 14, store: bool = True, end: date | None = None) -> Dict:
    if lookback_days < 2:
        raise ValueError("lookback_days must be at least 2")

    end_date = end or date.today()
    start_date = end_date - timedelta(days=lookback_days - 1)
    rows = _fetch_unique_history_rows(start_date, end_date)

    if store and rows:
        insert_unit_prices(crawler.provider, rows)

    snapshots: "OrderedDict[str, List[Dict]]" = OrderedDict()
    for row in rows:
        snapshot_date = row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"])
        snapshots.setdefault(snapshot_date, []).append(row)

    if len(snapshots) < 2:
        raise ValueError("Not enough distinct ASB price snapshots were found to compute changes")

    snapshot_dates = list(snapshots.keys())
    latest_date = snapshot_dates[-1]
    previous_date = snapshot_dates[-2]
    latest_rows = {row["scheme"]: row for row in snapshots[latest_date]}
    previous_rows = {row["scheme"]: row for row in snapshots[previous_date]}

    funds = []
    for scheme in sorted(latest_rows):
        latest_price = float(latest_rows[scheme]["unit_price"])
        previous_price = float(previous_rows.get(scheme, latest_rows[scheme])["unit_price"])
        unit_change = round(latest_price - previous_price, 6)
        percent_change = round((unit_change / previous_price) * 100, 4) if previous_price else 0.0
        funds.append(
            {
                "scheme": scheme,
                "current_unit_price": latest_price,
                "previous_unit_price": previous_price,
                "unit_change": unit_change,
                "percent_change": percent_change,
            }
        )

    return {
        "provider": crawler.provider,
        "latest_price_date": latest_date,
        "previous_price_date": previous_date,
        "funds": funds,
    }

from __future__ import annotations

import base64
import io
from collections import OrderedDict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Sequence

import matplotlib

# Use a non-GUI backend before importing pyplot so container builds stay headless.
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services import asb_service
from kiwisaver_insight.utils.db import fetch_prices, insert_unit_prices


@dataclass
class HistoricalTrendSeries:
    scheme: str
    points: List[Dict]


ANZ_CRAWLER = ANZCrawler()
WESTPAC_CRAWLER = WestpacCrawler()
SUPPORTED_PROVIDERS = ("ASB", "ANZ", "Westpac")


def list_supported_providers() -> List[str]:
    return list(SUPPORTED_PROVIDERS)


def current_price_changes_for_provider(
    provider: str,
    lookback_days: int = 14,
    store: bool = True,
    end: date | None = None,
) -> Dict:
    provider_name = _normalize_provider(provider)
    if provider_name == "ASB":
        return asb_service.current_price_changes(lookback_days=lookback_days, store=store, end=end)

    if lookback_days < 2:
        raise ValueError("lookback_days must be at least 2")

    end_date = end or date.today()
    start_date = end_date - timedelta(days=lookback_days - 1)

    try:
        rows = _fetch_live_rows(provider_name, start_date, end_date)
        if store and rows:
            insert_unit_prices(provider_name, rows)
        payload = _build_current_price_payload(provider_name, _group_snapshots(rows))
        payload["source"] = "live"
        return payload
    except Exception as exc:
        fallback = _db_snapshot_fallback(provider_name)
        if fallback is not None:
            fallback["warning_detail"] = str(exc)
            return fallback
        raise


def trend_series_for_provider(
    provider: str,
    start: date,
    end: date,
    schemes: Sequence[str] | None = None,
    ensure_fresh: bool = True,
) -> List[HistoricalTrendSeries]:
    provider_name = _normalize_provider(provider)
    if provider_name == "ASB":
        return [
            HistoricalTrendSeries(scheme=item.scheme, points=item.points)
            for item in asb_service.trend_series(start, end, schemes=schemes, ensure_fresh=ensure_fresh)
        ]

    if ensure_fresh:
        ensure_history_for_provider(provider_name, start, end, schemes=schemes)

    requested_schemes = list(schemes or [item.scheme for item in list_tracked_schemes(provider_name)])
    series: List[HistoricalTrendSeries] = []
    for scheme in requested_schemes:
        rows = fetch_prices(provider_name, scheme=scheme, start_date=start, end_date=end)
        if not rows:
            continue
        series.append(
            HistoricalTrendSeries(
                scheme=scheme,
                points=[
                    {
                        "date": row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"]),
                        "unit_price": row["unit_price"],
                    }
                    for row in rows
                ],
            )
        )
    return series


def ensure_history_for_provider(
    provider: str,
    start: date,
    end: date,
    schemes: Sequence[str] | None = None,
) -> None:
    provider_name = _normalize_provider(provider)
    if provider_name == "ASB":
        asb_service.ensure_history(start, end)
        return

    requested_schemes = list(schemes or [item.scheme for item in list_tracked_schemes(provider_name)])
    if provider_name == "ANZ":
        for scheme in requested_schemes:
            existing = fetch_prices(provider_name, scheme=scheme, start_date=start, end_date=end)
            if _covers_interval(existing, start, end):
                continue
            rows = ANZ_CRAWLER.fetch_history(scheme, start, end)
            if rows:
                insert_unit_prices(provider_name, rows)
        return

    if provider_name == "Westpac":
        rows = WESTPAC_CRAWLER.fetch_prices()
        if rows:
            insert_unit_prices(provider_name, rows)
        return

    raise ValueError(f"Unsupported provider: {provider}")


def generate_provider_trend_chart(provider: str, series: List[HistoricalTrendSeries], metric: str = "unit_price") -> str:
    if not series:
        raise ValueError("No trend series available to chart")

    provider_name = _normalize_provider(provider)
    plt.figure(figsize=(settings.trend_chart_width, settings.trend_chart_height))
    for trend in series:
        dates = [datetime.fromisoformat(point["date"]) for point in trend.points]
        values = [point.get(metric, point.get("unit_price")) for point in trend.points]
        plt.plot(dates, values, label=trend.scheme)

    plt.title(f"{provider_name} KiwiSaver {metric.replace('_', ' ').title()} Trend")
    plt.xlabel("Date")
    plt.ylabel(metric.replace("_", " ").title())
    plt.legend()
    plt.grid(True, linestyle="--", alpha=0.3)

    buffer = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buffer, format="png")
    plt.close()
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _normalize_provider(provider: str) -> str:
    normalized = provider.strip().upper()
    provider_map = {item.upper(): item for item in SUPPORTED_PROVIDERS}
    if normalized not in provider_map:
        raise ValueError(f"Unsupported provider: {provider}")
    return provider_map[normalized]


def _fetch_live_rows(provider: str, start: date, end: date) -> List[Dict]:
    if provider == "ANZ":
        rows = ANZ_CRAWLER.fetch_prices()
    elif provider == "Westpac":
        rows = WESTPAC_CRAWLER.fetch_prices()
    else:
        raise ValueError(f"Unsupported provider: {provider}")

    return [row for row in rows if start <= row["date"] <= end]


def _group_snapshots(rows: Sequence[Dict]) -> "OrderedDict[str, List[Dict]]":
    snapshots: "OrderedDict[str, List[Dict]]" = OrderedDict()
    for row in sorted(rows, key=lambda item: (item["date"], item["scheme"])):
        snapshot_date = row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"])
        snapshots.setdefault(snapshot_date, []).append(row)
    return snapshots


def _build_current_price_payload(provider: str, snapshots: "OrderedDict[str, List[Dict]]") -> Dict:
    if len(snapshots) < 2:
        raise ValueError(f"Not enough distinct {provider} price snapshots were found to compute changes")

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
        "provider": provider,
        "latest_price_date": latest_date,
        "previous_price_date": previous_date,
        "funds": funds,
    }


def _db_snapshot_fallback(provider: str) -> Dict | None:
    rows = fetch_prices(provider)
    snapshots = _group_snapshots(rows)
    if len(snapshots) < 2:
        return None
    payload = _build_current_price_payload(provider, snapshots)
    payload["source"] = "db_fallback"
    payload["warning"] = f"Live {provider} fetch failed; showing the latest stored database snapshots."
    return payload


def _covers_interval(rows: Sequence[Dict], start: date, end: date, min_points: int = 2) -> bool:
    if len(rows) < min_points:
        return False
    return rows[0]["date"] <= start and rows[-1]["date"] >= end

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, List

from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.services.asb_service import fetch_history
from kiwisaver_insight.utils.db import insert_unit_prices


@dataclass(frozen=True)
class AggressiveSchemeDefinition:
    provider: str
    scheme: str
    display_name: str
    fund_type: str = "Aggressive"


SCHEMES = [
    AggressiveSchemeDefinition("ASB", "Aggressive Fund", "ASB KiwiSaver Aggressive Fund"),
    AggressiveSchemeDefinition("ANZ", "High Growth Fund", "ANZ KiwiSaver High Growth Fund"),
    AggressiveSchemeDefinition("Westpac", "High Growth Fund", "Westpac KiwiSaver High Growth Fund"),
]


def list_aggressive_schemes() -> List[Dict]:
    return [
        {
            "provider": scheme.provider,
            "scheme": scheme.scheme,
            "display_name": scheme.display_name,
            "type": scheme.fund_type,
        }
        for scheme in SCHEMES
    ]


def collect_aggressive_unit_prices(
    start_date: date,
    end_date: date,
    store: bool = False,
) -> List[Dict]:
    if start_date > end_date:
        raise ValueError("start_date must be before end_date")

    rows_by_provider = {
        "ASB": _fetch_asb_aggressive_rows(start_date, end_date),
        "ANZ": ANZCrawler().fetch_history("High Growth Fund", start_date, end_date),
        "Westpac": _filter_range(WestpacCrawler().fetch_prices(), start_date, end_date),
    }

    collected: List[Dict] = []
    for scheme_def in SCHEMES:
        provider_rows = [
            {
                "provider": scheme_def.provider,
                "scheme": row["scheme"],
                "display_name": scheme_def.display_name,
                "unit_price": row["unit_price"],
                "date": row["date"],
            }
            for row in rows_by_provider[scheme_def.provider]
            if row["scheme"] == scheme_def.scheme
        ]

        if store and provider_rows:
            insert_unit_prices(
                scheme_def.provider,
                [{"scheme": row["scheme"], "unit_price": row["unit_price"], "date": row["date"]} for row in provider_rows],
            )

        collected.extend(provider_rows)

    collected.sort(key=lambda row: (row["provider"], row["date"]))
    return collected


def current_aggressive_prices(lookback_days: int = 30, store: bool = True) -> Dict:
    if lookback_days < 5:
        raise ValueError("lookback_days must be at least 5")

    end_date = date.today()
    start_date = end_date - timedelta(days=lookback_days - 1)
    rows = collect_aggressive_unit_prices(start_date, end_date, store=store)

    grouped: Dict[str, List[Dict]] = {}
    for row in rows:
        grouped.setdefault(row["provider"], []).append(row)

    funds = []
    for scheme_def in SCHEMES:
        provider_rows = grouped.get(scheme_def.provider, [])
        if len(provider_rows) < 1:
            continue

        provider_rows.sort(key=lambda row: row["date"])
        latest = provider_rows[-1]
        previous = provider_rows[-2] if len(provider_rows) > 1 else provider_rows[-1]
        unit_change = round(float(latest["unit_price"]) - float(previous["unit_price"]), 6)
        percent_change = (
            round((unit_change / float(previous["unit_price"])) * 100, 4)
            if float(previous["unit_price"])
            else 0.0
        )

        funds.append(
            {
                "provider": scheme_def.provider,
                "scheme": scheme_def.scheme,
                "display_name": scheme_def.display_name,
                "latest_price_date": _iso(latest["date"]),
                "previous_price_date": _iso(previous["date"]),
                "current_unit_price": float(latest["unit_price"]),
                "previous_unit_price": float(previous["unit_price"]),
                "unit_change": unit_change,
                "percent_change": percent_change,
            }
        )

    return {"funds": funds, "schemes": list_aggressive_schemes()}


def _fetch_asb_aggressive_rows(start_date: date, end_date: date) -> List[Dict]:
    rows = fetch_history(start_date, end_date, store=False)
    parsed: List[Dict] = []
    for row in rows:
        if row["scheme"] != "Aggressive Fund":
            continue
        parsed.append(
            {
                "scheme": row["scheme"],
                "unit_price": row["unit_price"],
                "date": _parse_date(row["date"]),
            }
        )
    return parsed


def _filter_range(rows: List[Dict], start_date: date, end_date: date) -> List[Dict]:
    return [row for row in rows if start_date <= row["date"] <= end_date]


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()


def _iso(value: date) -> str:
    return value.isoformat()

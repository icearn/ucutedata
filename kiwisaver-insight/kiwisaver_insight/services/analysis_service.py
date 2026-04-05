from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from math import prod
from statistics import pstdev
from typing import Any, Dict, List, Sequence

from pydantic import BaseModel

from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.asb import ASBCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.scheme_catalog import (
    TRACKED_SCHEMES_BY_ID,
    get_tracked_scheme_by_name,
    list_tracked_schemes,
)
from kiwisaver_insight.utils.db import fetch_prices, insert_unit_prices


class SchemeData(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    color: str


AVAILABLE_SCHEMES = [
    SchemeData(
        id=scheme.id,
        name=scheme.display_name,
        provider=scheme.provider,
        type=scheme.risk_level,
        color=scheme.color,
    )
    for scheme in list_tracked_schemes()
]

ASB_CRAWLER = ASBCrawler()
ANZ_CRAWLER = ANZCrawler()
WESTPAC_CRAWLER = WestpacCrawler()

BACKTEST_CALIBRATION_YEARS = 10
STRATEGY_TYPE_TO_RISK = {
    "cash": "Cash",
    "aggressive": "Aggressive",
    "growth": "Growth",
    "balanced": "Balanced",
    "conservative": "Conservative",
}
RISK_TO_STRATEGY_TYPE = {value: key for key, value in STRATEGY_TYPE_TO_RISK.items()}
SCENARIO_DEFINITIONS = {
    "same": {
        "label": "Stay with Same Scheme",
        "description": "Projection calibrated from the currently selected KiwiSaver scheme.",
        "color": "#3b82f6",
    },
    "worst": {
        "label": "Worst Choice Scheme",
        "description": "Projection calibrated from the weakest real backtest among tracked schemes.",
        "color": "#ef4444",
    },
    "normal": {
        "label": "Normal Switch Scheme",
        "description": "Projection calibrated from the median real backtest across tracked schemes.",
        "color": "#f59e0b",
    },
    "best": {
        "label": "Best Luck Jump Scheme",
        "description": "Projection calibrated from the strongest real backtest among tracked schemes.",
        "color": "#10b981",
    },
}
SCENARIO_ORDER = ["same", "worst", "normal", "best"]


class AnalysisDataUnavailableError(RuntimeError):
    pass


def generate_unit_price_history(scheme_id: str, years: int) -> List[Dict[str, Any]]:
    start_date, end_date = _analysis_window(years)
    priming_failures = _prime_selected_histories([scheme_id], start_date, end_date) or {}
    history = _load_scheme_history(scheme_id, start_date, end_date)
    tracked_scheme = TRACKED_SCHEMES_BY_ID.get(scheme_id)
    if tracked_scheme and not history:
        _raise_history_unavailable(
            tracked_scheme=tracked_scheme,
            start_date=start_date,
            end_date=end_date,
            failure=priming_failures.get(scheme_id),
            minimum_points=1,
        )
    return history


def build_current_scheme_analysis(
    scheme_ids: Sequence[str],
    years: int,
    initial_funds: float,
    monthly_contribution: float,
) -> Dict[str, Any]:
    start_date, end_date = _analysis_window(years)
    priming_failures = _prime_selected_histories(list(scheme_ids), start_date, end_date) or {}

    schemes_map = {scheme.id: scheme for scheme in AVAILABLE_SCHEMES}
    results = []
    for scheme_id in scheme_ids:
        scheme = schemes_map.get(scheme_id)
        if not scheme:
            continue

        history = _load_scheme_history(scheme_id, start_date, end_date)
        tracked_scheme = TRACKED_SCHEMES_BY_ID.get(scheme_id)
        if tracked_scheme and not history:
            _raise_history_unavailable(
                tracked_scheme=tracked_scheme,
                start_date=start_date,
                end_date=end_date,
                failure=priming_failures.get(scheme_id),
                minimum_points=1,
            )
        outcome = calculate_outcome(history, initial_funds, monthly_contribution)
        results.append(
            {
                "scheme": scheme.model_dump(),
                "history": history,
                "history_window": {
                    "requested_start": start_date.isoformat(),
                    "requested_end": end_date.isoformat(),
                    "available_start": history[0]["date"] if history else None,
                    "available_end": history[-1]["date"] if history else None,
                    "point_count": len(history),
                    "granularity": "monthly_real_prices",
                },
                "outcome": outcome,
            }
        )

    return {"results": results}


def calculate_outcome(price_history: List[Dict[str, Any]], initial_funds: float, monthly_contribution: float):
    if not price_history:
        return {"final_value": 0, "total_return": 0, "units": 0, "total_invested": 0}

    start_price = price_history[0]["price"]
    end_price = price_history[-1]["price"]

    total_units = initial_funds / start_price
    total_invested = initial_funds

    for index, point in enumerate(price_history):
        if index == 0:
            continue
        price = point["price"]
        total_units += monthly_contribution / price
        total_invested += monthly_contribution

    final_value = total_units * end_price
    total_return = final_value - total_invested

    return {
        "final_value": round(final_value),
        "total_return": round(total_return),
        "units": round(total_units, 2),
        "total_invested": round(total_invested),
    }


class SwitchCondition(BaseModel):
    id: str
    type: str
    label: str
    from_scheme: str
    to_scheme: str
    threshold: float
    threshold_unit: str


def build_scenario_comparison(
    selected_scheme: str,
    initial_funds: float,
    monthly_contribution: float,
    years: int,
) -> Dict[str, Any]:
    tracked_schemes = list_tracked_schemes()
    start_date, end_date = _analysis_window(min(years, BACKTEST_CALIBRATION_YEARS))
    priming_failures = _prime_selected_histories([tracked_scheme.id for tracked_scheme in tracked_schemes], start_date, end_date) or {}
    scheme_profiles = [
        _build_scheme_profile(
            scheme_id=tracked_scheme.id,
            initial_funds=initial_funds,
            monthly_contribution=monthly_contribution,
            calibration_years=min(years, BACKTEST_CALIBRATION_YEARS),
            prime_history=False,
            priming_failures=priming_failures,
        )
        for tracked_scheme in tracked_schemes
    ]
    scheme_profiles = [profile for profile in scheme_profiles if profile is not None]
    if not scheme_profiles:
        first_failure = next(iter(priming_failures.values()), None)
        if first_failure is not None:
            raise AnalysisDataUnavailableError(f"Scenario comparison data refresh failed: {first_failure}")
        raise AnalysisDataUnavailableError("Scenario comparison data is unavailable for the tracked KiwiSaver schemes.")

    selected_tracked_scheme = get_tracked_scheme_by_name(selected_scheme) or TRACKED_SCHEMES_BY_ID.get(
        scheme_profiles[0]["scheme"]["id"]
    )
    same_profile = next(
        (
            profile
            for profile in scheme_profiles
            if selected_tracked_scheme and profile["scheme"]["id"] == selected_tracked_scheme.id
        ),
        scheme_profiles[0],
    )

    ranked_profiles = sorted(
        scheme_profiles,
        key=lambda profile: (
            profile["model"]["annualized_return"],
            profile["backtest"]["final_balance"],
        ),
    )
    profile_by_scenario = {
        "same": same_profile,
        "worst": ranked_profiles[0],
        "normal": ranked_profiles[len(ranked_profiles) // 2],
        "best": ranked_profiles[-1],
    }

    scenarios = []
    for scenario_id in SCENARIO_ORDER:
        definition = SCENARIO_DEFINITIONS[scenario_id]
        profile = profile_by_scenario[scenario_id]
        projection = _build_projection_series(
            initial_funds=initial_funds,
            monthly_contribution=monthly_contribution,
            years=years,
            annualized_return=profile["model"]["annualized_return"],
        )
        scenarios.append(
            {
                "id": scenario_id,
                "label": definition["label"],
                "description": definition["description"],
                "color": definition["color"],
                "source_scheme": profile["scheme"],
                "backtest": profile["backtest"],
                "model": profile["model"],
                "projection": projection,
                "final_value": projection[-1]["balance"],
                "total_return": projection[-1]["returns"],
                "total_invested": projection[-1]["invested"],
            }
        )

    best_scenario = next(item for item in scenarios if item["id"] == "best")
    best_projection_end = best_scenario["projection"][-1]
    future_projections = _build_future_projection_checkpoints(
        base_balance=best_projection_end["balance"],
        base_invested=best_projection_end["invested"],
        monthly_contribution=monthly_contribution,
        annualized_return=best_scenario["model"]["annualized_return"],
        years_ahead=[5, 10, 15],
        base_years=years,
    )

    actual_years = max(
        scenario["backtest"]["source_months"] / 12 for scenario in scenarios if scenario["backtest"]["source_months"] > 0
    )

    return {
        "requested_years": years,
        "selected_scheme": same_profile["scheme"],
        "scenario_backtest_window": {
            "calibration_years": min(years, BACKTEST_CALIBRATION_YEARS),
            "max_actual_years_used": round(actual_years, 2),
        },
        "scenarios": scenarios,
        "best_scenario_id": "best",
        "future_projections": future_projections,
    }


def simulate_strategy(
    conditions: List[SwitchCondition],
    initial_funds: float,
    monthly_contribution: float,
    years: int = 10,
    selected_scheme: str | None = None,
):
    start_scheme = get_tracked_scheme_by_name(selected_scheme) if selected_scheme else None
    if start_scheme is None:
        start_scheme = next(
            scheme for scheme in list_tracked_schemes("ASB") if scheme.risk_level == "Balanced"
        )

    start_strategy_type = RISK_TO_STRATEGY_TYPE.get(start_scheme.risk_level, "balanced")
    provider_schemes = {
        RISK_TO_STRATEGY_TYPE[scheme.risk_level]: scheme
        for scheme in list_tracked_schemes(start_scheme.provider)
        if scheme.risk_level in RISK_TO_STRATEGY_TYPE
    }
    required_strategy_types = {start_strategy_type}
    required_strategy_types.update(condition.from_scheme for condition in conditions)
    required_strategy_types.update(condition.to_scheme for condition in conditions)

    missing_types = sorted(strategy_type for strategy_type in required_strategy_types if strategy_type not in provider_schemes)
    if missing_types:
        raise ValueError(f"Strategy cannot run because {start_scheme.provider} is missing risk buckets: {', '.join(missing_types)}")

    start_date, end_date = _analysis_window(min(years, BACKTEST_CALIBRATION_YEARS))
    priming_failures = _prime_selected_histories(
        [provider_schemes[strategy_type].id for strategy_type in required_strategy_types],
        start_date,
        end_date,
    ) or {}

    histories_by_type = {
        strategy_type: _load_scheme_history(provider_schemes[strategy_type].id, start_date, end_date)
        for strategy_type in required_strategy_types
    }
    histories_by_type = {key: value for key, value in histories_by_type.items() if len(value) >= 2}
    if start_strategy_type not in histories_by_type:
        _raise_history_unavailable(
            tracked_scheme=provider_schemes[start_strategy_type],
            start_date=start_date,
            end_date=end_date,
            failure=priming_failures.get(provider_schemes[start_strategy_type].id),
            minimum_points=2,
        )

    common_month_keys = sorted(
        set.intersection(
            *(set(point["date"][:7] for point in history) for history in histories_by_type.values())
        )
    )
    if len(common_month_keys) < 2:
        raise AnalysisDataUnavailableError(
            f"Not enough overlapping historical data is available to run the strategy for {start_scheme.display_name}."
        )

    history_maps = {
        strategy_type: {point["date"][:7]: point for point in history if point["date"][:7] in common_month_keys}
        for strategy_type, history in histories_by_type.items()
    }

    current_strategy_type = start_strategy_type
    balance = float(initial_funds)
    invested = float(initial_funds)
    switches = []
    data = []
    realized_returns = []

    first_point = history_maps[current_strategy_type][common_month_keys[0]]
    data.append(
        {
            "date": first_point["date"],
            "month": 0,
            "balance": round(balance),
            "invested": round(invested),
            "returns": round(balance - invested),
            "scheme": current_strategy_type,
            "provider_scheme": provider_schemes[current_strategy_type].display_name,
            "phase": "backtest",
        }
    )

    for month_index in range(1, len(common_month_keys)):
        previous_month_key = common_month_keys[month_index - 1]
        current_month_key = common_month_keys[month_index]
        previous_point = history_maps[current_strategy_type][previous_month_key]
        current_point = history_maps[current_strategy_type][current_month_key]

        previous_price = previous_point["price"]
        current_price = current_point["price"]
        monthly_return = (current_price / previous_price) - 1 if previous_price else 0.0
        balance = balance * (1 + monthly_return) + monthly_contribution
        invested += monthly_contribution
        realized_returns.append(monthly_return)

        performance_ratio = (balance / invested) if invested else 1.0
        data.append(
            {
                "date": current_point["date"],
                "month": month_index,
                "balance": round(balance),
                "invested": round(invested),
                "returns": round(balance - invested),
                "scheme": current_strategy_type,
                "provider_scheme": provider_schemes[current_strategy_type].display_name,
                "monthly_return_pct": round(monthly_return * 100, 4),
                "phase": "backtest",
            }
        )

        next_strategy_type = current_strategy_type
        for condition in conditions:
            if condition.from_scheme != current_strategy_type:
                continue
            threshold = float(condition.threshold or 0)
            if condition.type == "price_drop" and monthly_return * 100 <= -threshold:
                next_strategy_type = condition.to_scheme
            elif condition.type == "price_rise" and monthly_return * 100 >= threshold:
                next_strategy_type = condition.to_scheme
            elif condition.type == "time_based" and month_index % max(1, int(round(threshold * 12))) == 0:
                next_strategy_type = condition.to_scheme
            elif condition.type == "market_volatility" and abs(monthly_return * 100) >= threshold:
                next_strategy_type = condition.to_scheme
            elif condition.type == "performance_threshold" and performance_ratio <= threshold:
                next_strategy_type = condition.to_scheme
            if next_strategy_type != current_strategy_type:
                switches.append(
                    {
                        "month": month_index,
                        "date": current_point["date"],
                        "from": current_strategy_type,
                        "to": next_strategy_type,
                        "reason": condition.label,
                    }
                )
                current_strategy_type = next_strategy_type
                break

    model = _projection_model_from_returns(
        realized_returns,
        "Strategy Path",
        source_start=data[0]["date"],
        source_end=data[-1]["date"],
    )
    future_projections = _build_future_projection_checkpoints(
        base_balance=round(balance),
        base_invested=round(invested),
        monthly_contribution=monthly_contribution,
        annualized_return=model["annualized_return"],
        years_ahead=[5, 10, 15],
        base_years=round(len(realized_returns) / 12, 2),
    )

    return {
        "data": data,
        "switches": switches,
        "final_balance": round(balance),
        "total_invested": round(invested),
        "actual_window": {
            "provider": start_scheme.provider,
            "start_date": data[0]["date"],
            "end_date": data[-1]["date"],
            "point_count": len(data),
            "source_months": len(realized_returns),
        },
        "model": model,
        "future_projections": future_projections,
        "start_scheme": _scheme_payload(start_scheme),
    }


def _build_scheme_profile(
    scheme_id: str,
    initial_funds: float,
    monthly_contribution: float,
    calibration_years: int,
    prime_history: bool = True,
    priming_failures: Dict[str, Exception] | None = None,
) -> Dict[str, Any] | None:
    tracked_scheme = TRACKED_SCHEMES_BY_ID.get(scheme_id)
    if not tracked_scheme:
        return None

    start_date, end_date = _analysis_window(min(calibration_years, BACKTEST_CALIBRATION_YEARS))
    failures = priming_failures or {}
    if prime_history:
        failures = _prime_selected_histories([scheme_id], start_date, end_date) or {}
    history = _load_scheme_history(scheme_id, start_date, end_date)
    if len(history) < 2:
        if scheme_id in failures:
            _raise_history_unavailable(
                tracked_scheme=tracked_scheme,
                start_date=start_date,
                end_date=end_date,
                failure=failures.get(scheme_id),
                minimum_points=2,
            )
        return None

    actual_series = _build_backtest_series_from_history(history, initial_funds, monthly_contribution)
    model = _projection_model_from_history(history, tracked_scheme.display_name)
    last_point = actual_series[-1]

    return {
        "scheme": _scheme_payload(tracked_scheme),
        "history": history,
        "backtest_series": actual_series,
        "backtest": {
            "start_date": actual_series[0]["date"],
            "end_date": actual_series[-1]["date"],
            "point_count": len(actual_series),
            "source_months": len(history) - 1,
            "final_balance": last_point["balance"],
            "total_invested": last_point["invested"],
            "total_return": last_point["returns"],
        },
        "model": model,
    }


def _build_backtest_series_from_history(
    history: List[Dict[str, Any]],
    initial_funds: float,
    monthly_contribution: float,
) -> List[Dict[str, Any]]:
    if not history:
        return []

    first_point = history[0]
    units = initial_funds / first_point["price"] if first_point["price"] else 0.0
    invested = float(initial_funds)
    series = [
        {
            "date": first_point["date"],
            "month": 0,
            "balance": round(initial_funds),
            "invested": round(invested),
            "returns": 0,
            "unit_price": first_point["price"],
            "phase": "backtest",
        }
    ]

    previous_price = first_point["price"]
    for month_index, point in enumerate(history[1:], start=1):
        units += monthly_contribution / point["price"]
        invested += monthly_contribution
        balance = units * point["price"]
        monthly_return_pct = ((point["price"] / previous_price) - 1) * 100 if previous_price else 0.0
        series.append(
            {
                "date": point["date"],
                "month": month_index,
                "balance": round(balance),
                "invested": round(invested),
                "returns": round(balance - invested),
                "unit_price": point["price"],
                "monthly_return_pct": round(monthly_return_pct, 4),
                "phase": "backtest",
            }
        )
        previous_price = point["price"]

    return series


def _projection_model_from_history(history: List[Dict[str, Any]], label: str) -> Dict[str, Any]:
    if len(history) < 2:
        return _projection_model_from_returns([], label)

    monthly_returns = [
        (history[index]["price"] / history[index - 1]["price"]) - 1
        for index in range(1, len(history))
        if history[index - 1]["price"]
    ]
    return _projection_model_from_returns(
        monthly_returns,
        label,
        source_start=history[0]["date"],
        source_end=history[-1]["date"],
    )


def _projection_model_from_returns(
    monthly_returns: List[float],
    label: str,
    source_start: str | None = None,
    source_end: str | None = None,
) -> Dict[str, Any]:
    if not monthly_returns:
        return {
            "label": label,
            "annualized_return": 0.0,
            "monthly_model_return": 0.0,
            "annualized_volatility": 0.0,
            "source_months": 0,
            "source_start": source_start,
            "source_end": source_end,
        }

    gross_growth = prod(1 + monthly_return for monthly_return in monthly_returns)
    annualized_return = gross_growth ** (12 / len(monthly_returns)) - 1 if gross_growth > 0 else -1.0
    monthly_model_return = (1 + annualized_return) ** (1 / 12) - 1 if annualized_return > -1 else -0.999999
    annualized_volatility = pstdev(monthly_returns) * (12 ** 0.5) if len(monthly_returns) > 1 else 0.0

    return {
        "label": label,
        "annualized_return": round(annualized_return, 6),
        "monthly_model_return": round(monthly_model_return, 6),
        "annualized_volatility": round(annualized_volatility, 6),
        "source_months": len(monthly_returns),
        "source_start": source_start,
        "source_end": source_end,
    }


def _build_projection_series(
    initial_funds: float,
    monthly_contribution: float,
    years: int,
    annualized_return: float,
) -> List[Dict[str, Any]]:
    monthly_rate = (1 + annualized_return) ** (1 / 12) - 1 if annualized_return > -1 else -0.999999
    balance = float(initial_funds)
    invested = float(initial_funds)
    points = [
        {
            "year": 0,
            "balance": round(balance),
            "invested": round(invested),
            "returns": round(balance - invested),
        }
    ]

    for year in range(1, years + 1):
        for _ in range(12):
            balance = balance * (1 + monthly_rate) + monthly_contribution
            invested += monthly_contribution
        points.append(
            {
                "year": year,
                "balance": round(balance),
                "invested": round(invested),
                "returns": round(balance - invested),
            }
        )

    return points


def _build_future_projection_checkpoints(
    base_balance: float,
    base_invested: float,
    monthly_contribution: float,
    annualized_return: float,
    years_ahead: List[int],
    base_years: float,
) -> List[Dict[str, Any]]:
    checkpoints = []
    monthly_rate = (1 + annualized_return) ** (1 / 12) - 1 if annualized_return > -1 else -0.999999

    for years in years_ahead:
        balance = float(base_balance)
        invested = float(base_invested)
        for _ in range(years * 12):
            balance = balance * (1 + monthly_rate) + monthly_contribution
            invested += monthly_contribution
        checkpoints.append(
            {
                "years_ahead": years,
                "total_years": round(base_years + years, 2),
                "projected_value": round(balance),
                "projected_gain": round(balance - base_balance),
                "projected_total_return": round(balance - invested),
            }
        )

    return checkpoints


def _scheme_payload(tracked_scheme) -> Dict[str, Any]:
    return {
        "id": tracked_scheme.id,
        "name": tracked_scheme.display_name,
        "provider": tracked_scheme.provider,
        "scheme": tracked_scheme.scheme,
        "type": tracked_scheme.risk_level,
        "color": tracked_scheme.color,
    }


def _analysis_window(years: int) -> tuple[date, date]:
    end_date = date.today()
    start_date = end_date - timedelta(days=max(years, 1) * 365)
    return start_date, end_date


def _prime_selected_histories(scheme_ids: List[str], start_date: date, end_date: date) -> Dict[str, Exception]:
    tracked = [TRACKED_SCHEMES_BY_ID[scheme_id] for scheme_id in scheme_ids if scheme_id in TRACKED_SCHEMES_BY_ID]
    if not tracked:
        return {}

    providers = {scheme.provider for scheme in tracked}
    failures: Dict[str, Exception] = {}

    if "ASB" in providers:
        try:
            _ensure_asb_history(start_date, end_date)
        except Exception as exc:
            for scheme in tracked:
                if scheme.provider == "ASB":
                    failures[scheme.id] = exc

    for scheme in tracked:
        if scheme.provider == "ANZ":
            try:
                _ensure_anz_history(scheme.scheme, start_date, end_date)
            except Exception as exc:
                failures[scheme.id] = exc

    if "Westpac" in providers:
        try:
            _ensure_westpac_history()
        except Exception as exc:
            for scheme in tracked:
                if scheme.provider == "Westpac":
                    failures[scheme.id] = exc

    return failures


def _ensure_asb_history(start_date: date, end_date: date) -> None:
    existing_rows = fetch_prices("ASB", start_date=start_date, end_date=end_date)
    existing_months = {_month_key(row["date"]) for row in existing_rows}
    rows_to_insert: List[Dict[str, Any]] = []

    for snapshot_date in _month_end_dates(start_date, end_date):
        if _month_key(snapshot_date) in existing_months:
            continue
        rows_to_insert.extend(ASB_CRAWLER.fetch_prices(snapshot_date))
        existing_months.add(_month_key(snapshot_date))

    if rows_to_insert:
        insert_unit_prices("ASB", rows_to_insert)


def _ensure_anz_history(scheme_name: str, start_date: date, end_date: date) -> None:
    existing_rows = fetch_prices("ANZ", scheme=scheme_name, start_date=start_date, end_date=end_date)
    existing_months = {_month_key(row["date"]) for row in existing_rows}
    required_months = {_month_key(value) for value in _month_end_dates(start_date, end_date)}
    if required_months.issubset(existing_months):
        return

    rows = ANZ_CRAWLER.fetch_history(scheme_name, start_date, end_date)
    if rows:
        insert_unit_prices("ANZ", rows)


def _ensure_westpac_history() -> None:
    rows = WESTPAC_CRAWLER.fetch_prices()
    if rows:
        insert_unit_prices("Westpac", rows)


def _load_scheme_history(scheme_id: str, start_date: date, end_date: date) -> List[Dict[str, Any]]:
    tracked_scheme = TRACKED_SCHEMES_BY_ID.get(scheme_id)
    if not tracked_scheme:
        return []

    rows = fetch_prices(
        tracked_scheme.provider,
        scheme=tracked_scheme.scheme,
        start_date=start_date,
        end_date=end_date,
    )
    return _to_monthly_history(rows)


def _month_end_dates(start_date: date, end_date: date) -> List[date]:
    dates: List[date] = []
    year = start_date.year
    month = start_date.month

    while True:
        last_day = monthrange(year, month)[1]
        snapshot_date = date(year, month, last_day)
        if snapshot_date > end_date:
            snapshot_date = end_date

        if snapshot_date >= start_date and (not dates or dates[-1] != snapshot_date):
            dates.append(snapshot_date)

        if year == end_date.year and month == end_date.month:
            break

        month += 1
        if month == 13:
            month = 1
            year += 1

    return dates


def _month_key(value: date) -> str:
    return value.strftime("%Y-%m")


def _to_monthly_history(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rows:
        return []

    latest_row_by_month: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        latest_row_by_month[_month_key(row["date"])] = row

    history: List[Dict[str, Any]] = []
    for row in latest_row_by_month.values():
        point_date = row["date"]
        history.append(
            {
                "date": point_date.strftime("%Y-%m-%d"),
                "timestamp": int(datetime.combine(point_date, datetime.min.time()).timestamp() * 1000),
                "price": round(float(row["unit_price"]), 4),
            }
        )

    return history


def _raise_history_unavailable(
    tracked_scheme,
    start_date: date,
    end_date: date,
    failure: Exception | None = None,
    minimum_points: int = 1,
) -> None:
    if failure is not None:
        raise AnalysisDataUnavailableError(
            f"Historical data for {tracked_scheme.display_name} could not be refreshed "
            f"between {start_date.isoformat()} and {end_date.isoformat()}: {failure}"
        )

    if minimum_points <= 1:
        raise AnalysisDataUnavailableError(
            f"Historical data for {tracked_scheme.display_name} is unavailable "
            f"between {start_date.isoformat()} and {end_date.isoformat()}."
        )

    raise AnalysisDataUnavailableError(
        f"Not enough historical data is available to analyze {tracked_scheme.display_name} "
        f"between {start_date.isoformat()} and {end_date.isoformat()}."
    )

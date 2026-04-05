from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from kiwisaver_insight.scheme_catalog import get_tracked_scheme_by_name
from kiwisaver_insight.services.analysis_service import SwitchCondition, simulate_strategy
from kiwisaver_insight.utils.db import (
    fetch_latest_strategy_recommendation,
    insert_strategy_recommendation,
)

REVIEW_CYCLE = "Recalculate monthly after the scheduled provider update, or immediately after a material scheme change."
DISCLAIMER = (
    "This recommendation is derived from historical KiwiSaver unit-price backtests and a reusable projection model. "
    "It is informational only and does not guarantee future performance."
)

STRATEGY_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "stay_put",
        "label": "Stay Put",
        "audience": "Clients who prefer maximum simplicity and do not want rule-triggered switching.",
        "summary": "Remain in the selected scheme for the full backtest window.",
        "style": "low_touch",
        "conditions": [],
    },
    {
        "id": "drawdown_guard",
        "label": "Drawdown Guard",
        "audience": "Clients who want smoother downside control when growth buckets sell off.",
        "summary": "Step down one risk bucket after sharp monthly losses, then re-enter on recovery.",
        "style": "defensive",
        "conditions": [
            {"id": "dg-1", "type": "price_drop", "label": "Aggressive drawdown guard", "from_scheme": "aggressive", "to_scheme": "growth", "threshold": 3.5, "threshold_unit": "%"},
            {"id": "dg-2", "type": "price_drop", "label": "Growth drawdown guard", "from_scheme": "growth", "to_scheme": "balanced", "threshold": 3.0, "threshold_unit": "%"},
            {"id": "dg-3", "type": "price_drop", "label": "Balanced drawdown guard", "from_scheme": "balanced", "to_scheme": "conservative", "threshold": 2.25, "threshold_unit": "%"},
            {"id": "dg-4", "type": "price_rise", "label": "Recovery re-entry", "from_scheme": "conservative", "to_scheme": "balanced", "threshold": 0.8, "threshold_unit": "%"},
        ],
    },
    {
        "id": "recovery_ladder",
        "label": "Recovery Ladder",
        "audience": "Clients willing to climb back into growth as momentum improves.",
        "summary": "Add risk in stages when monthly momentum strengthens, and step back after a sharp setback.",
        "style": "balanced",
        "conditions": [
            {"id": "rl-1", "type": "price_rise", "label": "Conservative to balanced recovery", "from_scheme": "conservative", "to_scheme": "balanced", "threshold": 1.0, "threshold_unit": "%"},
            {"id": "rl-2", "type": "price_rise", "label": "Balanced to growth recovery", "from_scheme": "balanced", "to_scheme": "growth", "threshold": 1.5, "threshold_unit": "%"},
            {"id": "rl-3", "type": "price_rise", "label": "Growth to aggressive momentum", "from_scheme": "growth", "to_scheme": "aggressive", "threshold": 2.0, "threshold_unit": "%"},
            {"id": "rl-4", "type": "price_drop", "label": "Aggressive setback control", "from_scheme": "aggressive", "to_scheme": "growth", "threshold": 3.0, "threshold_unit": "%"},
        ],
    },
    {
        "id": "volatility_shield",
        "label": "Volatility Shield",
        "audience": "Clients who prefer reacting to unstable months more than chasing upside.",
        "summary": "De-risk quickly when monthly volatility spikes and review back into balanced exposure annually.",
        "style": "capital_preservation",
        "conditions": [
            {"id": "vs-1", "type": "market_volatility", "label": "Aggressive volatility shield", "from_scheme": "aggressive", "to_scheme": "balanced", "threshold": 3.5, "threshold_unit": "%"},
            {"id": "vs-2", "type": "market_volatility", "label": "Growth volatility shield", "from_scheme": "growth", "to_scheme": "balanced", "threshold": 3.0, "threshold_unit": "%"},
            {"id": "vs-3", "type": "market_volatility", "label": "Balanced volatility shield", "from_scheme": "balanced", "to_scheme": "conservative", "threshold": 2.0, "threshold_unit": "%"},
            {"id": "vs-4", "type": "time_based", "label": "Annual re-risk review", "from_scheme": "conservative", "to_scheme": "balanced", "threshold": 1, "threshold_unit": "years"},
        ],
    },
]


def build_strategy_recommendation(
    selected_scheme: str,
    initial_funds: float,
    monthly_contribution: float,
    years: int,
    user_id: Optional[str] = None,
    risk_preference: Optional[str] = None,
    objective: Optional[str] = None,
    persist: bool = True,
) -> Dict[str, Any]:
    tracked_scheme = get_tracked_scheme_by_name(selected_scheme)
    if tracked_scheme is None:
        raise ValueError(f"Unknown tracked scheme: {selected_scheme}")

    risk_preference = risk_preference or _infer_risk_preference(tracked_scheme.risk_level)
    objective = objective or _infer_objective(risk_preference)

    evaluated: List[Dict[str, Any]] = []
    baseline_result: Dict[str, Any] | None = None
    for template in STRATEGY_TEMPLATES:
        conditions = [SwitchCondition(**item) for item in template["conditions"]]
        simulation = simulate_strategy(
            conditions=conditions,
            initial_funds=initial_funds,
            monthly_contribution=monthly_contribution,
            years=years,
            selected_scheme=selected_scheme,
        )
        candidate = _candidate_payload(
            template=template,
            simulation=simulation,
            risk_preference=risk_preference,
            objective=objective,
        )
        if template["id"] == "stay_put":
            baseline_result = candidate
        evaluated.append(candidate)

    if baseline_result is None:
        raise ValueError("Baseline strategy evaluation failed")

    for candidate in evaluated:
        candidate["comparison_to_baseline"] = _baseline_comparison(candidate, baseline_result)
        candidate["why_recommended"] = _recommendation_reasons(candidate, baseline_result, risk_preference, objective)

    ranked = sorted(evaluated, key=lambda candidate: candidate["score"], reverse=True)
    top_strategies = ranked[:3]
    recommended_strategy = top_strategies[0]

    response = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "user_id": user_id,
        "selected_scheme": {
            "id": tracked_scheme.id,
            "name": tracked_scheme.display_name,
            "provider": tracked_scheme.provider,
            "scheme": tracked_scheme.scheme,
            "type": tracked_scheme.risk_level,
            "color": tracked_scheme.color,
        },
        "risk_preference": risk_preference,
        "objective": objective,
        "recommended_strategy": recommended_strategy,
        "top_strategies": top_strategies,
        "review_cycle": REVIEW_CYCLE,
        "disclaimer": DISCLAIMER,
    }

    if persist:
        record = insert_strategy_recommendation(
            user_id=user_id,
            selected_scheme=tracked_scheme.display_name,
            provider=tracked_scheme.provider,
            risk_preference=risk_preference,
            objective=objective,
            recommended_strategy_id=recommended_strategy["id"],
            payload=response,
        )
        response["recommendation_record"] = record

    return response


def get_latest_strategy_recommendation(user_id: str, selected_scheme: Optional[str] = None) -> Optional[Dict[str, Any]]:
    return fetch_latest_strategy_recommendation(user_id=user_id, selected_scheme=selected_scheme)


def _candidate_payload(
    template: Dict[str, Any],
    simulation: Dict[str, Any],
    risk_preference: str,
    objective: str,
) -> Dict[str, Any]:
    max_drawdown_pct = _max_drawdown_pct(simulation.get("data", []))
    annualized_return = float(simulation.get("model", {}).get("annualized_return", 0.0))
    annualized_volatility = float(simulation.get("model", {}).get("annualized_volatility", 0.0))
    score = _score_candidate(
        annualized_return=annualized_return,
        annualized_volatility=annualized_volatility,
        max_drawdown_pct=max_drawdown_pct,
        switch_count=len(simulation.get("switches", [])),
        risk_preference=risk_preference,
        objective=objective,
    )

    return {
        "id": template["id"],
        "label": template["label"],
        "audience": template["audience"],
        "summary": template["summary"],
        "style": template["style"],
        "score": round(score, 3),
        "confidence": _confidence_label(
            source_months=int(simulation.get("actual_window", {}).get("source_months", 0) or 0),
            switch_count=len(simulation.get("switches", [])),
            max_drawdown_pct=max_drawdown_pct,
        ),
        "switch_rules": template["conditions"],
        "backtest": {
            "final_balance": simulation.get("final_balance", 0),
            "total_invested": simulation.get("total_invested", 0),
            "total_return": simulation.get("final_balance", 0) - simulation.get("total_invested", 0),
            "annualized_return": round(annualized_return, 6),
            "annualized_volatility": round(annualized_volatility, 6),
            "max_drawdown_pct": round(max_drawdown_pct, 4),
            "switch_count": len(simulation.get("switches", [])),
            "source_months": simulation.get("actual_window", {}).get("source_months", 0),
            "start_date": simulation.get("actual_window", {}).get("start_date"),
            "end_date": simulation.get("actual_window", {}).get("end_date"),
            "provider": simulation.get("actual_window", {}).get("provider"),
        },
        "future_projections": simulation.get("future_projections", []),
        "start_scheme": simulation.get("start_scheme"),
        "review_cycle": REVIEW_CYCLE,
    }


def _infer_risk_preference(risk_level: str) -> str:
    if risk_level == "Cash":
        return "conservative"
    if risk_level == "Conservative":
        return "conservative"
    if risk_level == "Aggressive":
        return "aggressive"
    return "balanced"


def _infer_objective(risk_preference: str) -> str:
    if risk_preference == "conservative":
        return "preserve_capital"
    if risk_preference == "aggressive":
        return "maximize_growth"
    return "balance_growth_risk"


def _score_candidate(
    annualized_return: float,
    annualized_volatility: float,
    max_drawdown_pct: float,
    switch_count: int,
    risk_preference: str,
    objective: str,
) -> float:
    profile_weights = {
        "conservative": {"return": 18, "volatility": 16, "drawdown": 24, "switches": 2.2},
        "balanced": {"return": 24, "volatility": 12, "drawdown": 16, "switches": 1.6},
        "aggressive": {"return": 32, "volatility": 8, "drawdown": 9, "switches": 1.2},
    }
    objective_adjustment = {
        "preserve_capital": {"return": -2, "volatility": 4, "drawdown": 8, "switches": 0.2},
        "balance_growth_risk": {"return": 0, "volatility": 0, "drawdown": 0, "switches": 0},
        "maximize_growth": {"return": 8, "volatility": -2, "drawdown": -4, "switches": -0.2},
    }
    weights = profile_weights.get(risk_preference, profile_weights["balanced"]).copy()
    for key, value in objective_adjustment.get(objective, {}).items():
        weights[key] += value

    return (
        annualized_return * 100 * weights["return"]
        - annualized_volatility * 100 * weights["volatility"]
        - max_drawdown_pct * weights["drawdown"]
        - switch_count * weights["switches"]
    )


def _max_drawdown_pct(points: List[Dict[str, Any]]) -> float:
    peak = 0.0
    max_drawdown = 0.0

    for point in points:
        balance = float(point.get("balance", 0.0) or 0.0)
        peak = max(peak, balance)
        if peak <= 0:
            continue
        drawdown = ((peak - balance) / peak) * 100
        max_drawdown = max(max_drawdown, drawdown)

    return max_drawdown


def _confidence_label(source_months: int, switch_count: int, max_drawdown_pct: float) -> str:
    if source_months >= 84 and switch_count <= 8 and max_drawdown_pct <= 12:
        return "high"
    if source_months >= 36:
        return "medium"
    return "low"


def _baseline_comparison(candidate: Dict[str, Any], baseline: Dict[str, Any]) -> Dict[str, Any]:
    balance_delta = candidate["backtest"]["final_balance"] - baseline["backtest"]["final_balance"]
    baseline_balance = baseline["backtest"]["final_balance"] or 1
    return {
        "baseline_strategy_id": baseline["id"],
        "baseline_strategy_label": baseline["label"],
        "final_balance_delta": round(balance_delta),
        "final_balance_delta_pct": round((balance_delta / baseline_balance) * 100, 4),
    }


def _recommendation_reasons(
    candidate: Dict[str, Any],
    baseline: Dict[str, Any],
    risk_preference: str,
    objective: str,
) -> List[str]:
    reasons = [
        f"Backtest annualized return {candidate['backtest']['annualized_return'] * 100:.2f}% with max drawdown {candidate['backtest']['max_drawdown_pct']:.2f}%.",
        f"Triggered {candidate['backtest']['switch_count']} switch events across {candidate['backtest']['source_months']} monthly observations.",
    ]

    delta = candidate["comparison_to_baseline"]["final_balance_delta"]
    if candidate["id"] == baseline["id"]:
        reasons.append("Acts as the simplest reference strategy with no switching logic.")
    elif delta >= 0:
        reasons.append(f"Finished ${delta:,.0f} ahead of the stay-put baseline over the same backtest window.")
    else:
        reasons.append(f"Finished ${abs(delta):,.0f} below the stay-put baseline, but may better match a {risk_preference} risk posture.")

    reasons.append(f"Objective alignment: {objective.replace('_', ' ')}.")
    return reasons

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from kiwisaver_insight.scheme_catalog import list_tracked_scheme_payloads
from kiwisaver_insight.services.alert_monitor_service import (
    create_alert_rule,
    disable_alert_rule,
    evaluate_active_alerts,
    list_alert_events,
    list_alert_rules,
)
from kiwisaver_insight.services.asb_service import (
    calculate_returns,
    current_price_changes,
    fetch_history,
    generate_trend_chart,
    trend_series,
)
from kiwisaver_insight.services.aggressive_funds_service import (
    collect_aggressive_unit_prices,
    current_aggressive_prices,
    list_aggressive_schemes,
)
from kiwisaver_insight.services.verification_service import verify_live_sources_against_db
from kiwisaver_insight.services.strategy_recommendation_service import (
    build_strategy_recommendation,
    get_latest_strategy_recommendation,
)
from kiwisaver_insight.utils.db import ensure_runtime_schema, insert_unit_prices, list_schemes

API_DESCRIPTION = """
Operational API for KiwiSaver unit-price ingestion, storage, analytics, and verification.

- Swagger UI: `/docs`
- OpenAPI JSON: `/openapi.json`
"""

app = FastAPI(
    title="KiwiSaver Insight API",
    version="1.0.0",
    description=API_DESCRIPTION.strip(),
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_event_handler("startup", ensure_runtime_schema)


class FetchRequest(BaseModel):
    start_date: date = Field(..., description="Start date (inclusive)")
    end_date: Optional[date] = Field(None, description="End date (inclusive)")
    store: bool = Field(False, description="Persist fetched prices to Postgres")


class TrendRequest(BaseModel):
    start_date: date
    end_date: date
    schemes: Optional[List[str]] = None
    include_chart: bool = True


class ReturnsRequest(BaseModel):
    schemes: List[str]
    start_date: date
    end_date: date
    initial_amount: float = Field(..., gt=0)


class IngestRow(BaseModel):
    scheme: str
    unit_price: float
    date: date


class IngestRequest(BaseModel):
    provider: str = "ASB"
    rows: List[IngestRow]


class AggressiveCollectRequest(BaseModel):
    start_date: date
    end_date: date
    store: bool = Field(True, description="Persist fetched prices to Postgres")


class AlertRuleCreateRequest(BaseModel):
    user_id: str = Field(..., description="Application user or tenant identifier")
    provider: str = Field(..., description="Tracked KiwiSaver provider")
    scheme: str = Field(..., description="Tracked fund name within the provider")
    metric: str = Field(..., description="`unit_price` or `percent_change`")
    comparison: str = Field(..., description="`gte`, `lte`, or `eq`")
    target_value: float = Field(..., description="Target price or target percent move")
    reference_price: Optional[float] = Field(
        None,
        description="Optional baseline price for percent-change alerts. Defaults to latest live/stored price.",
    )
    label: Optional[str] = Field(None, description="Optional friendly label for the rule")
    channel: str = Field("common_api", description="Logical outbound channel identifier")
    channel_target: Optional[str] = Field(None, description="Optional target on the outbound channel")
    trigger_once: bool = Field(True, description="When true, notify once then mark the rule as triggered")


@app.get("/", include_in_schema=False)
def api_index():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/asb/schemes")
def api_schemes():
    return {"provider": "ASB", "schemes": list_schemes("ASB")}


@app.get("/api/schemes/tracked")
def api_tracked_schemes():
    return {"schemes": list_tracked_scheme_payloads()}


@app.get("/api/aggressive-funds/schemes")
def api_aggressive_schemes():
    return {"schemes": list_aggressive_schemes()}


@app.post("/api/alerts/rules")
def api_create_alert_rule(req: AlertRuleCreateRequest):
    try:
        return create_alert_rule(req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/alerts/rules")
def api_list_alert_rules(
    user_id: Optional[str] = Query(None),
    active_only: Optional[bool] = Query(None),
):
    return {"rules": list_alert_rules(user_id=user_id, active_only=active_only)}


@app.post("/api/alerts/rules/{rule_id}/disable")
def api_disable_alert_rule(rule_id: int):
    try:
        return disable_alert_rule(rule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/alerts/events")
def api_list_alert_events(
    user_id: Optional[str] = Query(None),
    rule_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    return {"events": list_alert_events(user_id=user_id, rule_id=rule_id, limit=limit)}


@app.post("/api/alerts/evaluate")
def api_evaluate_alerts():
    return evaluate_active_alerts()


@app.post("/api/asb/fetch")
def api_fetch(req: FetchRequest):
    end_date = req.end_date or req.start_date
    data = fetch_history(req.start_date, end_date, store=req.store)
    return {"provider": "ASB", "count": len(data), "data": data}


@app.post("/api/asb/trends")
def api_trends(req: TrendRequest):
    series = trend_series(req.start_date, req.end_date, schemes=req.schemes)
    if not series:
        raise HTTPException(status_code=404, detail="No data available for requested period")
    chart = generate_trend_chart(series) if req.include_chart else None
    return {
        "series": [s.__dict__ for s in series],
        "chart": chart,
    }


@app.get("/api/asb/current-prices")
def api_current_prices(
    lookback_days: int = Query(14, ge=2, le=60),
    store: bool = Query(True),
):
    try:
        return current_price_changes(lookback_days=lookback_days, store=store)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/aggressive-funds/collect")
def api_collect_aggressive_funds(req: AggressiveCollectRequest):
    try:
        rows = collect_aggressive_unit_prices(req.start_date, req.end_date, store=req.store)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"count": len(rows), "data": rows}


@app.get("/api/aggressive-funds/current-prices")
def api_current_aggressive_prices(
    lookback_days: int = Query(30, ge=5, le=120),
    store: bool = Query(True),
):
    try:
        return current_aggressive_prices(lookback_days=lookback_days, store=store)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/verification/live-vs-db")
def api_live_vs_db_verification():
    try:
        return verify_live_sources_against_db()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/asb/returns")
def api_returns(req: ReturnsRequest):
    result = calculate_returns(req.schemes, req.start_date, req.end_date, req.initial_amount)
    if not result["comparison"]:
        raise HTTPException(status_code=404, detail="Unable to calculate returns with available data")
    return result


@app.post("/api/asb/ingest")
def api_ingest(req: IngestRequest):
    if not req.rows:
        raise HTTPException(status_code=400, detail="No rows supplied")
    insert_unit_prices(
        req.provider,
        [row.model_dump() for row in req.rows],
    )
    return {"provider": req.provider, "inserted": len(req.rows)}


class UserProfile(BaseModel):
    user_id: str
    initial_funds: float
    personal_contribution: float
    company_contribution: float
    years: int
    selected_scheme: str


@app.post("/api/user/profile")
def save_user_profile(profile: UserProfile):
    # TODO: Persist to database
    return {"status": "saved", "profile": profile}


from kiwisaver_insight.services.analysis_service import (
    build_current_scheme_analysis,
    build_scenario_comparison,
    simulate_strategy,
    SwitchCondition,
)

# ... (keep existing imports)

# ... (keep existing code)

class CurrentSchemeRequest(BaseModel):
    scheme_ids: List[str]
    years: int
    initial_funds: float
    monthly_contribution: float


class ScenarioComparisonRequest(BaseModel):
    selected_scheme: str
    initial_funds: float
    monthly_contribution: float
    years: int


@app.post("/api/analysis/current-scheme")
def api_current_scheme_analysis(req: CurrentSchemeRequest):
    return build_current_scheme_analysis(
        req.scheme_ids,
        req.years,
        req.initial_funds,
        req.monthly_contribution,
    )


@app.post("/api/scenarios/compare")
def api_scenario_comparison(req: ScenarioComparisonRequest):
    return build_scenario_comparison(
        req.selected_scheme,
        req.initial_funds,
        req.monthly_contribution,
        req.years,
    )


class StrategyBacktestRequest(BaseModel):
    conditions: List[SwitchCondition]
    initial_funds: float
    monthly_contribution: float
    years: int = 10
    selected_scheme: Optional[str] = None


class StrategyRecommendationRequest(BaseModel):
    selected_scheme: str
    initial_funds: float
    monthly_contribution: float
    years: int = 10
    user_id: Optional[str] = None
    risk_preference: Optional[str] = None
    objective: Optional[str] = None
    persist: bool = True

@app.post("/api/strategy/backtest")
def api_strategy_backtest(req: StrategyBacktestRequest):
    try:
        simulation = simulate_strategy(
            req.conditions,
            req.initial_funds,
            req.monthly_contribution,
            req.years,
            req.selected_scheme,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return simulation


@app.post("/api/strategy/recommendation")
def api_strategy_recommendation(req: StrategyRecommendationRequest):
    try:
        return build_strategy_recommendation(
            selected_scheme=req.selected_scheme,
            initial_funds=req.initial_funds,
            monthly_contribution=req.monthly_contribution,
            years=req.years,
            user_id=req.user_id,
            risk_preference=req.risk_preference,
            objective=req.objective,
            persist=req.persist,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/strategy/recommendation/latest")
def api_latest_strategy_recommendation(
    user_id: str = Query(...),
    selected_scheme: Optional[str] = Query(None),
):
    recommendation = get_latest_strategy_recommendation(user_id=user_id, selected_scheme=selected_scheme)
    if recommendation is None:
        raise HTTPException(status_code=404, detail="No saved strategy recommendation found")
    return recommendation

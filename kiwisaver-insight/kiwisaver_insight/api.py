from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from kiwisaver_insight.services.asb_service import (
    calculate_returns,
    fetch_history,
    generate_trend_chart,
    trend_series,
)
from kiwisaver_insight.utils.db import insert_unit_prices, list_schemes

app = FastAPI(title="KiwiSaver Insight API", version="1.0.0")


class FetchRequest(BaseModel):
    start_date: date = Field(..., description="Start date (inclusive)")
    end_date: Optional[date] = Field(None, description="End date (inclusive)")
    store: bool = Field(False, description="Persist fetched prices to Postgres")


class TrendRequest(BaseModel):
    start_date: date
    end_date: date
    schemes: Optional[List[str]] = None


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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/asb/schemes")
def api_schemes():
    return {"provider": "ASB", "schemes": list_schemes("ASB")}


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
    chart = generate_trend_chart(series)
    return {
        "series": [s.__dict__ for s in series],
        "chart": chart,
    }


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

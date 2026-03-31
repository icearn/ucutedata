# KiwiSaver Insight Backend API, Dataflow, and Verification

## Swagger / OpenAPI

- Local API base: `http://localhost:8001`
- Swagger UI: `http://localhost:8001/docs`
- Root shortcut: `http://localhost:8001/` redirects to Swagger UI
- OpenAPI JSON: `http://localhost:8001/openapi.json`

## Current Dataflow

```text
ASB HTML form page
ANZ public JSON APIs
Westpac public PDF
        |
        v
Provider-specific crawlers
        |
        v
Service layer normalizes rows to a shared shape
        |
        +--> optional insert into Postgres
        |
        v
FastAPI responses for current prices, trends, returns, analysis, and verification
        |
        v
Mobile / web clients or operational scripts
```

## Source-Specific Ingestion Behavior

### ASB

- Source: `https://www.asb.co.nz/iFrames/latest_unit_prices.asp`
- Access pattern: HTML form post with `currentDay`, `currentMonth`, and `currentYear`
- Parser: `kiwisaver_insight/crawlers/asb.py`
- Service: `kiwisaver_insight/services/asb_service.py`
- Important nuance: ASB can return the same latest snapshot for weekends and future dates. The service deduplicates repeated snapshots and keeps only the first date where a new snapshot appears in the requested range.

### ANZ

- Source list API: `https://customer.anz.co.nz/api/historical-unit-prices/funds?reportName=ANZUnitprices`
- Source history API: `https://customer.anz.co.nz/api/historical-unit-prices`
- Parser: `kiwisaver_insight/crawlers/anz.py`
- Current aggressive-equivalent scheme: `High Growth Fund`
- Access pattern: resolve fund code first, then request historical unit prices for a date range

### Westpac

- Source: `https://www.westpac.co.nz/assets/Personal/investments/documents/Unit-price-information/Exit-Unit-Prices-Westpac-NZ.pdf`
- Parser: `kiwisaver_insight/crawlers/westpac.py`
- Current aggressive-equivalent scheme: `High Growth Fund`
- Access pattern: download PDF, extract text, parse the `Exit Unit Price as at` dates and scheme rows

## Normalized Data Format

All crawlers are normalized to the same logical row shape before storage or API use:

```json
{
  "provider": "ASB",
  "scheme": "Aggressive Fund",
  "unit_price": 1.3643,
  "date": "2026-03-29"
}
```

Notes:

- API responses use ISO date strings such as `2026-03-29`
- Python service internals may still hold `date` objects until serialization
- Unit prices are stored and compared at 6 decimal places or less, depending on the source

## Data Storage

Primary storage is PostgreSQL table `kiwisaver_unit_prices`.

```sql
CREATE TABLE IF NOT EXISTS kiwisaver_unit_prices (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, scheme, price_date)
);
```

Storage characteristics:

- Grain: one row per `provider + scheme + price_date`
- Idempotency: duplicate ingests are ignored by the unique constraint
- Numeric precision: `NUMERIC(18,6)` for stable storage and comparisons
- Read pattern: services query by provider, scheme, and date range, then sort by `price_date`

## Kafka Status

Kafka is available in `docker/docker-compose.yml` and starts with the local stack on `localhost:9094`.

Current state:

- Kafka is infrastructure-ready only
- There is no Kafka producer or consumer implemented in `kiwisaver_insight/` yet
- The current live ingestion path is synchronous: crawler -> service -> Postgres -> API response

This matters for architecture discussions: Kafka is part of the environment, but not yet part of the data path.

## Backend API Surface

Important endpoints:

- `GET /health`
- `GET /api/asb/schemes`
- `POST /api/asb/fetch`
- `POST /api/asb/trends`
- `GET /api/asb/current-prices`
- `POST /api/asb/returns`
- `POST /api/asb/ingest`
- `GET /api/aggressive-funds/schemes`
- `POST /api/aggressive-funds/collect`
- `GET /api/aggressive-funds/current-prices`
- `GET /api/verification/live-vs-db`
- `POST /api/analysis/current-scheme`
- `POST /api/strategy/backtest`

## API Consumption Examples

Fetch current ASB changes:

```bash
curl "http://localhost:8001/api/asb/current-prices?lookback_days=14&store=true"
```

Fetch current aggressive-fund changes across ASB, ANZ, and Westpac:

```bash
curl "http://localhost:8001/api/aggressive-funds/current-prices?lookback_days=30&store=true"
```

Run the live-source-vs-DB reconciliation:

```bash
curl "http://localhost:8001/api/verification/live-vs-db"
```

Trend request example:

```bash
curl -X POST "http://localhost:8001/api/asb/trends" \
  -H "Content-Type: application/json" \
  -d "{\"start_date\":\"2026-03-01\",\"end_date\":\"2026-03-31\",\"schemes\":[\"Aggressive Fund\"],\"include_chart\":false}"
```

Browser client example:

```ts
const response = await fetch("http://localhost:8001/api/verification/live-vs-db");
const payload = await response.json();
console.log(payload.summary, payload.checks);
```

## Verification Endpoint

Endpoint:

- `GET /api/verification/live-vs-db`

Purpose:

- Fetch the latest live source snapshots from ASB, ANZ, and Westpac
- Compare each live price to the latest stored row in Postgres for the same `provider + scheme`
- Current coverage: all tracked ASB schemes, plus ANZ `High Growth Fund` and Westpac `High Growth Fund`
- Return a reconciliation summary and per-fund status list

Response shape:

```json
{
  "verified_at_utc": "2026-04-01T00:00:00+00:00",
  "sources": {
    "ASB": "https://www.asb.co.nz/iFrames/latest_unit_prices.asp",
    "ANZ": "https://customer.anz.co.nz/ANZUnitPrices",
    "Westpac": "https://www.westpac.co.nz/assets/Personal/investments/documents/Unit-price-information/Exit-Unit-Prices-Westpac-NZ.pdf"
  },
  "summary": {
    "total": 9,
    "match": 9,
    "stale_db": 0,
    "price_mismatch": 0,
    "missing_in_db": 0,
    "future_db": 0
  },
  "checks": [
    {
      "provider": "ASB",
      "scheme": "Aggressive Fund",
      "display_name": "ASB KiwiSaver Aggressive Fund",
      "source_url": "https://www.asb.co.nz/iFrames/latest_unit_prices.asp",
      "source_price_date": "2026-03-31",
      "source_unit_price": 1.3643,
      "db_price_date": "2026-03-31",
      "db_unit_price": 1.3643,
      "status": "MATCH",
      "note": "Stored row matches the current live source snapshot.",
      "unit_price_delta": 0.0
    }
  ]
}
```

Status meanings:

- `MATCH`: stored row and live source agree on date and price
- `STALE_DB`: stored data is older than the current live source snapshot
- `PRICE_MISMATCH`: same date exists in DB, but the price differs from the live source
- `MISSING_IN_DB`: no stored row exists for that provider and scheme
- `FUTURE_DB`: DB row date is newer than the source date being compared

## Daily Verification Runbook

Recommended daily sequence in New Zealand time:

1. Refresh current source data into Postgres.
2. Call `GET /api/verification/live-vs-db`.
3. Alert on `PRICE_MISMATCH`, `MISSING_IN_DB`, or `FUTURE_DB`.
4. Investigate `STALE_DB` only after confirming the provider has actually published a newer date.

Provider-specific expectations:

- ASB may repeat the prior trading-day snapshot on weekends and non-publishing days.
- ANZ may legitimately lag the current calendar date by several days.
- Westpac publishes a PDF that can include multiple recent dates in one document.

Suggested automation:

- Batch refresh: use the crawler container or API endpoints to load fresh prices into Postgres.
- Verification: run `GET /api/verification/live-vs-db` immediately after refresh.
- Alerting: trigger Slack or email when any status other than `MATCH` appears, except allowed provider lag conditions.

## Recommended Next Improvement

If this project moves into daily operations, add a dedicated verification audit table such as `kiwisaver_source_verification_runs` so each daily check is historically stored with:

- verification timestamp
- provider
- scheme
- source date and source price
- stored date and stored price
- verification status
- parsing or transport error details

That would make source drift, parser regressions, and operational data gaps auditable over time.

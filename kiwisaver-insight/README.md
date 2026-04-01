# KiwiSaver Insight Platform

Agent-ready toolkit for harvesting ASB KiwiSaver unit prices, persisting them to Postgres, and serving analytics (trend charts + return calculations) over HTTP or CLI.

## Features

- **Data Harvesting**: Automated scraping of ASB KiwiSaver unit prices.
- **Data Persistence**: Robust storage in PostgreSQL with upsert capabilities.
- **Analytics API**: HTTP endpoints for trend charts, return calculations, and portfolio analysis.
- **Strategy Backtesting**: Simulate investment strategies over historical data (up to 10 years).
- **Mobile Integration**: Backend support for the React Native mobile app.

## Project Layout
```
kiwisaver-insight/
├── kiwisaver_insight/        # Source package (crawler, API, services)
├── database/schema.sql       # Table definition for kiwisaver_unit_prices
├── docker/                   # Optional standalone compose stack
├── Dockerfile                # FastAPI + scheduler container
├── requirements.txt          # Python deps
└── README.md
```

## Quick Start
1. **Configure DB access** – copy `.env` and ensure it points to the Postgres instance that should hold KiwiSaver data.
2. **Install deps locally (optional)**
   ```bash
   pip install --break-system-packages -r requirements.txt
   ```
3. **Create table**
   ```bash
   psql "$DB_NAME" -f database/schema.sql
   ```
4. **Run CLI once**
   ```bash
   python3 -m kiwisaver_insight.main --days 7 --store
   ```
   This fetches the last 7 trading days from ASB, prints them to stdout, and inserts them into Postgres.

## FastAPI Service
Build + run the lightweight HTTP service (used by n8n):
```bash
docker build -t kiwisaver-insight .
docker run --rm -p 8000:8000 --env-file .env kiwisaver-insight
```

## Mobile App
The project now includes a React Native mobile application in the `mobile/` directory.

### Quick Start
1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```
2. **Run the app**:
   - **Web**: `npm run web`
   - **Android**: `npm run android` (requires Android Studio/Emulator)
   - **iOS**: `npm run ios` (requires Xcode/Simulator, macOS only)

The app connects to the backend at `http://localhost:8000` (iOS/Web) or `http://10.0.2.2:8000` (Android). Ensure the backend is running.

### Key Endpoints
| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/asb/fetch` | Fetches ASB unit prices for a date range; optional `store=true` persists to Postgres. |
| POST | `/api/asb/trends` | Returns unit-price trend data and a base64 PNG chart for the requested schemes. |
| POST | `/api/asb/returns` | Calculates portfolio returns for one or more schemes (table + chart). |
| POST | `/api/analysis/current-scheme` | **New**: Returns historical data and projected outcomes for selected schemes. |
| POST | `/api/strategy/backtest` | **New**: Runs a 10-year backtest for a user-defined switching strategy. |
| GET  | `/health` | Liveness probe. |

Example payload:
```jsonc
POST /api/asb/returns
{
  "schemes": ["Aggressive Fund", "Growth Fund"],
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "initial_amount": 10000
}
```

## Scheduling
- **One-off / cron**: call `python3 -m kiwisaver_insight.main --store --days 1` from cron/systemd.
- **Inside Docker**: run the container with `command: ["python", "-m", "kiwisaver_insight.main", "--store", "--days", "1"]` for batch jobs.
- **API mode (default CMD)** keeps the service online for agent workflows (e.g., n8n HTTP Request nodes).

### Docker Cron Crawler
- The `crawler` service now runs a cron scheduler inside the container instead of a one-shot batch command.
- On container startup it runs one immediate incremental crawl, then keeps cron in the foreground.
- Each run first checks the latest stored record in Postgres and resumes from `latest_db_date + 1 day`.
- Current coverage:
  - `ASB`: all ASB KiwiSaver schemes
  - `ANZ`: `High Growth Fund`
  - `Westpac`: `High Growth Fund`
- Default schedule: `15 18 * * 1-5` in `Pacific/Auckland`
- Override with env vars in `.env` or compose:
  - `CRON_SCHEDULE`
  - `TZ`

## Development

### Running Tests
The project uses `pytest` for testing.

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_analysis.py
```

### Linting & Formatting
Ensure code quality before committing:
```bash
# Example (adjust based on your preferred tools)
black kiwisaver_insight tests
flake8 kiwisaver_insight tests
```

## Notes
- Uses the legacy ASB iframe endpoint to access historical unit prices by supplying day/month/year form fields.
- All charts are rendered via Matplotlib (Agg backend) and returned as base64 so n8n can embed them directly.
- Insertions upsert on `provider + scheme + price_date`, preventing duplicate history loads.

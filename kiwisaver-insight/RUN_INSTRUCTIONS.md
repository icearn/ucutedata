# KiwiSaver Insight Run Instructions

This guide is written for the current project layout and current feature set.

If your goal is to get the whole solution running and then learn how to use it, use the Docker-first path below. It is the clearest and most reliable way to start the platform on Windows.

## 1. What You Are Starting

When the full stack is running, these services should be available:

| Service | Purpose | URL / Port |
| ------ | ------ | ------ |
| Web app | Main UI for viewing live prices, alerts, analysis, and strategy tools | `http://localhost:3000` or Expo dev URL |
| Backend API | FastAPI backend and Swagger docs | `http://localhost:8001/docs` |
| API health | Quick liveness check | `http://localhost:8001/health` |
| Postgres | Main database | `localhost:5433` |
| Kafka | Event backbone for notifications | `localhost:9094` |
| Message Hub | Shared notification consumer layer | `http://localhost:8010/health` |
| pgAdmin | Optional DB admin UI | `http://localhost:8080` |
| Crawler cron | Background scheduled data collection | Runs inside `kiwisaver_crawler` container |

## 2. Recommended Startup Path

### Prerequisites

You should have:

- Docker Desktop running
- WSL2 working normally on Windows
- Node.js 18+ installed
- npm installed

You do not need to install Postgres or Kafka locally if you use Docker.

### Step 0: Prepare local environment values

Before starting the stack, create a local `.env` from the example template.

PowerShell:

```powershell
cd d:\code\ucutedata\kiwisaver-insight
Copy-Item .env.example .env
```

Then edit `.env` and set your own local values for:

- `DB_PASSWORD`
- `PGADMIN_DEFAULT_PASSWORD`
- any optional Slack / SMTP / webhook settings you want to use

The checked-in `.env.example` uses safe sample values only. The real `.env` should stay local and should not be committed.

### Step 1: Start Docker Desktop

Before doing anything else, make sure Docker Desktop is fully running.

Quick checks in PowerShell:

```powershell
docker version
docker ps
```

If `docker version` cannot reach the server, Docker Desktop is not ready yet.

### Step 2: Start the backend stack

Open PowerShell and run:

```powershell
cd d:\code\ucutedata\kiwisaver-insight
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml ps
```

Expected containers:

- `kiwisaver_db`
- `kiwisaver_kafka`
- `kiwisaver_api`
- `kiwisaver_crawler`
- `message_hub`
- `kiwisaver_pgadmin`

If one container is restarting repeatedly, inspect it with:

```powershell
docker logs <container_name> --tail 200
```

### Step 3: Verify the backend stack

Open these URLs in the browser:

- Swagger: `http://localhost:8001/docs`
- API health: `http://localhost:8001/health`
- Message Hub health: `http://localhost:8010/health`
- pgAdmin: `http://localhost:8080`

Expected results:

- Swagger page loads and shows the backend endpoints
- `/health` returns a healthy JSON response
- Message Hub health returns status JSON
- pgAdmin login page opens

pgAdmin default login from compose:

- Email: value of `PGADMIN_DEFAULT_EMAIL` in your local `.env`
- Password: value of `PGADMIN_DEFAULT_PASSWORD` in your local `.env`

Postgres connection values:

- Host: `localhost`
- Port: `5433`
- Database: value of `DB_NAME` in your local `.env`
- Username: value of `DB_USER` in your local `.env`
- Password: value of `DB_PASSWORD` in your local `.env`

## 3. Start the Web App

Open a second PowerShell terminal:

```powershell
cd d:\code\ucutedata\kiwisaver-insight\mobile
npm install
```

You have two good ways to run the UI.

### Option A: Expo dev server

Use this while developing:

```powershell
npm run web
```

Then:

- wait for Expo to start
- press `w` if the browser does not open automatically

This usually opens an Expo web URL such as `http://localhost:8081`.

### Option B: Stable local web build

Use this when you want a cleaner browser session:

```powershell
npx expo export -p web
npx serve dist -l 3000
```

Then open:

`http://localhost:3000`

## 4. First-Time Walkthrough In The App

When the app opens for the first time:

1. Read and accept the legal disclaimer.
2. You will be taken to the `Settings` screen.
3. Fill in your profile values:
   - initial funds
   - personal contribution
   - company contribution
   - years
   - selected scheme
4. Save the settings.
5. Move through the tabs at the bottom.

Important screen roles:

- `Historical`: the main live unit price screen. Use this to verify real provider data, switch funds, change period ranges, and create alerts.
- `Analysis`: compare schemes and explore analysis results.
- `Strategy`: run strategy backtests.
- `Settings`: update your saved profile and default scheme.

If you want to validate the real fetched prices, use `Historical`, not `Analysis`.

## 5. How To Use The Main Features

### A. Live KiwiSaver Unit Prices

Go to the `Historical` tab.

What to do there:

- review the latest unit price cards
- switch between funds
- change the time range such as `1M`, `3M`, or `6M`
- confirm the trend chart reloads and the loaded date range changes
- create alert rules in the `Alert Monitor` section

This is the best screen for checking live data that came from ASB, ANZ, and Westpac crawlers.

### B. Alerts And Monitoring

Still in `Historical`:

1. Select a fund.
2. In `Alert Monitor`, choose:
   - metric: `unit_price` or `percent_change`
   - comparison: `>=`, `<=`, or exact match
   - target value
3. Click `Create Alert`.

What happens after that:

- the alert rule is stored in Postgres
- after each scheduled crawler run, the backend evaluates active alerts
- if a rule triggers, an event is published to Kafka
- `message-hub` consumes the event and sends it to configured channels

If no real Slack/email/SMS/webhook config is set, the default behavior is usually console-style local delivery or queued internal status only.

### C. Scheme Analysis

Go to the `Analysis` tab.

What to do there:

- use `Select Schemes`
- compare by provider or by risk level
- switch periods
- review comparison charts and projected outcomes

This screen is for comparison and analysis behavior. It is not the raw live-price verification screen.

### D. Strategy Builder

Go to the `Strategy` tab.

What to do there:

- define switching conditions
- run the backtest
- review the balance curve and summary results

## 6. Daily Operations And Useful Checks

### Check whether the crawler cron job has run today

The crawler writes to the log file inside the `kiwisaver_crawler` container.

Example:

```powershell
docker exec kiwisaver_crawler sh -lc "tail -n 200 /var/log/kiwisaver-crawler.log"
```

If you want to look for a specific date:

```powershell
docker exec kiwisaver_crawler sh -lc "grep '\"run_date\": \"2026-04-03\"' /var/log/kiwisaver-crawler.log"
```

You can also inspect the latest stored dates in Postgres:

```powershell
docker exec kiwisaver_db psql -U kiwisaver_app -d kiwisaver -c "select provider, scheme, max(price_date) as latest_price_date from kiwisaver_unit_prices group by provider, scheme order by provider, scheme;"
```

### Watch crawler logs live

```powershell
docker logs -f kiwisaver_crawler
```

### Watch API logs live

```powershell
docker logs -f kiwisaver_api
```

### Watch message-hub logs live

```powershell
docker logs -f message_hub
```

## 7. Stop And Restart

### Stop the whole backend stack

```powershell
cd d:\code\ucutedata\kiwisaver-insight
docker compose -f docker/docker-compose.yml down
```

### Stop and remove volumes as well

Only do this if you intentionally want to wipe Docker-managed Postgres and Kafka data.

```powershell
docker compose -f docker/docker-compose.yml down -v
```

### Restart one service

```powershell
docker restart kiwisaver_api
docker restart kiwisaver_crawler
docker restart message_hub
```

## 8. Troubleshooting

### The web app cannot reach the backend

Check:

- `http://localhost:8001/docs` opens
- `http://localhost:8001/health` responds
- the web app is using `http://localhost:8001`

If needed, inspect:

```powershell
docker logs kiwisaver_api --tail 200
```

### Docker Desktop is running but Docker commands still fail

Try:

```powershell
docker version
docker context ls
wsl -l -v
```

If the Docker engine is stuck, restart Docker Desktop and rerun the compose command.

### The crawler is running but no new rows are being added

Possible reasons:

- the provider has not published a new daily price yet
- the crawler resumed correctly and found nothing new
- the provider source format changed and the crawler needs adjustment

Check:

- crawler logs
- API verification endpoints in Swagger
- latest DB dates in Postgres

### Alerts are stored but no real message is received

This usually means the core alert flow worked, but outbound delivery is not fully configured yet.

Check:

- `message_hub` container is running
- Kafka is running
- channel-specific env vars are configured if you want real delivery

Examples:

- Slack needs `SLACK_WEBHOOK_URL`
- Email needs SMTP values
- SMS / WhatsApp / IM usually need their webhook targets configured

## 9. Optional Local Development Path

If you specifically want to run parts of the backend without Docker, read the project `README.md` and `.env` setup first. For normal learning, testing, and daily use, the Docker-first path in this file is the recommended path.

# KiwiSaver Insight Platform

This project provides a foundation for building a KiwiSaver return insight platform with daily unit price tracking and web/mobile interfaces.

## 🧱 Project Structure
```
kiwisaver_insight/
├── kiwisaver_insight/           # Source code
├── docker/                      # Docker Compose environment
├── .env                         # DB environment configuration
├── Dockerfile                   # App Dockerfile (to be added)
├── Makefile                     # Dev-friendly automation
└── README.md
```

## 🚀 Getting Started

### 1. Configure `.env`
Edit your `.env` file with local or cloud DB credentials:
```dotenv
DB_NAME=kiwisaver
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

### 2. Start the Environment
```bash
make up         # Start all containers (PostgreSQL, pgAdmin, crawler)
make logs       # Tail logs
```

### 3. Initialize the Database
```bash
make dbinit     # Run schema.sql to create required tables
```

### 4. Run Crawler Manually (Inside Container)
```bash
make shell
python kiwisaver_insight/main.py
```

### 5. Stop the Environment
```bash
make down
```

## 🛠️ Services
- `db`: PostgreSQL (port 5432)
- `pgadmin`: Web UI at [http://localhost:8080](http://localhost:8080)
- `crawler`: Runs daily crawlers defined in `kiwisaver_insight/crawlers/`

## 📌 To Do
- Add Dockerfile for app runtime
- Add FastAPI server
- Add React / React Native UI
- Improve crawler robustness & test coverage

---
Feel free to extend this Makefile and structure as the platform scales 📈

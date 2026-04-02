# How to Run the KiwiSaver Insight App

This guide will help you start both the Backend API and the Mobile Application to test the new "Current Scheme Analysis" and "Strategy Builder" features.

## 1. Prerequisites
-   **Python 3.10+** installed.
-   **Node.js 18+** installed.
-   **PostgreSQL** (Optional for this demo, as we are using mock data for the analysis features, but required for the full app).

## 2. Start the Backend Stack

The backend stack handles ingestion, APIs, alert evaluation, Kafka, and the shared message hub consumer.

1.  Open a terminal.
2.  Navigate to the project root:
    ```bash
    cd c:\Users\hans\code\ucutedata\kiwisaver-insight
    ```
3.  Start the Docker stack:
    ```bash
    docker compose -f docker/docker-compose.yml up -d --build
    ```
4.  Verify the main endpoints:
    *   API Swagger: [http://localhost:8001/docs](http://localhost:8001/docs)
    *   Message Hub: [http://localhost:8010/health](http://localhost:8010/health)
    *   pgAdmin: [http://localhost:8080](http://localhost:8080)

## 3. Start the Mobile App (Web Version)

We will run the mobile app in a web browser for easy testing.

1.  Open a **new** terminal window.
2.  Navigate to the mobile directory:
    ```bash
    cd c:\Users\hans\code\ucutedata\kiwisaver-insight\mobile
    ```
3.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
4.  Start the web server:
    ```bash
    npx expo start --web
    ```
    *   Press `w` in the terminal if it doesn't open automatically.
    *   Alternatively, to serve a production build (faster):
        ```bash
        npx expo export -p web
        npx serve dist
        ```
        Then open [http://localhost:3000](http://localhost:3000).

## 4. Verify New Features

Once both are running:

1.  Open your browser to the mobile app URL (usually `http://localhost:8081` or `http://localhost:3000`).
2.  **Current Scheme Analysis**:
    *   The app should load directly to the "Analysis" tab (or navigate to it).
    *   You should see a "Welcome to Your Analysis" banner.
    *   Try toggling different schemes (ANZ, ASB, etc.) and changing the time period (1Y, 3Y, etc.).
    *   Verify the chart updates and the "Projected Outcomes" cards change.
3.  **Strategy Builder**:
    *   Click the "Strategy" tab in the bottom navigation.
    *   You should see the "Strategy Builder" screen.
    *   Click "Run Backtest (10 Years)".
    *   Wait for the simulation to complete and view the "Backtest Results" graph and stats.

## Troubleshooting

-   **Backend Connection Error**: If the mobile app says it can't connect, ensure the backend API is running on port `8001`.
-   **Message Hub Delivery**: Kafka-backed notifications are consumed by `message-hub` on port `8010`. Real Slack/email/SMS/WhatsApp delivery requires the relevant env vars to be configured.
-   **Visual Glitches**: If icons are missing, ensure `lucide-react-native` is installed correctly (`npm install`).

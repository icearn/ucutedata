import os
from dataclasses import dataclass
from datetime import timedelta

from dotenv import load_dotenv

# Ensure local .env is honoured both in CLI and container usage.
load_dotenv()


@dataclass
class Settings:
    """Centralised configuration for the KiwiSaver insight toolchain."""

    # Defaults here are example-only. Real local values should come from `.env`.
    db_name: str = os.getenv("DB_NAME", "kiwisaver")
    db_user: str = os.getenv("DB_USER", "kiwisaver_app")
    db_password: str = os.getenv("DB_PASSWORD", "change_me_local_db_password")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
    message_hub_topic: str = os.getenv("MESSAGE_HUB_TOPIC", "message-hub.notifications.v1")
    message_hub_source_app: str = os.getenv("MESSAGE_HUB_SOURCE_APP", "kiwisaver-insight")

    asb_unit_price_url: str = os.getenv(
        "ASB_UNIT_PRICE_URL", "https://www.asb.co.nz/iFrames/latest_unit_prices.asp"
    )
    anz_funds_url: str = os.getenv(
        "ANZ_FUNDS_URL",
        "https://customer.anz.co.nz/api/historical-unit-prices/funds?reportName=ANZUnitprices",
    )
    anz_historical_unit_price_url: str = os.getenv(
        "ANZ_HISTORICAL_UNIT_PRICE_URL",
        "https://customer.anz.co.nz/api/historical-unit-prices",
    )
    westpac_unit_price_pdf_url: str = os.getenv(
        "WESTPAC_UNIT_PRICE_PDF_URL",
        "https://www.westpac.co.nz/assets/Personal/investments/documents/Unit-price-information/Exit-Unit-Prices-Westpac-NZ.pdf",
    )
    asb_history_backoff_seconds: float = float(
        os.getenv("ASB_HISTORY_BACKOFF_SECONDS", "0.35")
    )
    asb_history_default_days: int = int(os.getenv("ASB_HISTORY_DEFAULT_DAYS", "30"))
    asb_timeout_seconds: int = int(os.getenv("ASB_TIMEOUT_SECONDS", "30"))
    alert_dispatch_webhook_url: str | None = os.getenv("ALERT_DISPATCH_WEBHOOK_URL")
    alert_exact_tolerance: float = float(os.getenv("ALERT_EXACT_TOLERANCE", "0.0001"))

    trend_chart_width: int = int(os.getenv("TREND_CHART_WIDTH", "12"))
    trend_chart_height: int = int(os.getenv("TREND_CHART_HEIGHT", "6"))

    @property
    def default_history_window(self):
        return timedelta(days=self.asb_history_default_days)


settings = Settings()

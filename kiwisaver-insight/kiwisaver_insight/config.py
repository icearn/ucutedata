import os
from dataclasses import dataclass
from datetime import timedelta

from dotenv import load_dotenv

# Ensure local .env is honoured both in CLI and container usage
load_dotenv()


@dataclass
class Settings:
    """Centralised configuration for the KiwiSaver insight toolchain."""

    db_name: str = os.getenv("DB_NAME", "kiwisaver")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))

    asb_unit_price_url: str = os.getenv(
        "ASB_UNIT_PRICE_URL", "https://www.asb.co.nz/iFrames/latest_unit_prices.asp"
    )
    asb_history_backoff_seconds: float = float(
        os.getenv("ASB_HISTORY_BACKOFF_SECONDS", "0.35")
    )
    asb_history_default_days: int = int(os.getenv("ASB_HISTORY_DEFAULT_DAYS", "30"))
    asb_timeout_seconds: int = int(os.getenv("ASB_TIMEOUT_SECONDS", "30"))

    trend_chart_width: int = int(os.getenv("TREND_CHART_WIDTH", "12"))
    trend_chart_height: int = int(os.getenv("TREND_CHART_HEIGHT", "6"))

    @property
    def default_history_window(self):
        return timedelta(days=self.asb_history_default_days)


settings = Settings()

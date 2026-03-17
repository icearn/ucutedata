from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List

from bs4 import BeautifulSoup

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.base import BaseCrawler
from kiwisaver_insight.utils.http_helpers import create_session


class ASBCrawler(BaseCrawler):
    """Scraper for ASB KiwiSaver scheme unit prices."""

    def __init__(self):
        super().__init__("ASB")
        self.session = create_session(timeout=settings.asb_timeout_seconds)
        self.base_url = settings.asb_unit_price_url

    def fetch_prices(self, target_date: date | None = None) -> List[dict]:
        target_date = target_date or date.today()
        payload = {
            "currentDay": target_date.day,
            "currentMonth": target_date.month,
            "currentYear": target_date.year,
        }
        response = self.session.post(self.base_url, data=payload)
        response.raise_for_status()
        return self._parse_html(response.text, target_date)

    def _parse_html(self, html: str, target_date: date) -> List[dict]:
        soup = BeautifulSoup(html, "html.parser")
        price_rows = soup.select("div.prices tr")

        capture = False
        parsed: List[dict] = []
        for row in price_rows:
            text = row.get_text(strip=True)
            if not text:
                continue
            if "ASB KiwiSaver Scheme" in text:
                capture = True
                continue
            if not capture:
                continue

            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            scheme = cells[0].get_text(strip=True)
            price_text = cells[1].get_text(strip=True).replace(",", "")
            if not scheme or not price_text:
                continue

            try:
                price = float(Decimal(price_text))
            except Exception:
                # Stop capturing when a new section begins (non-numeric cell)
                if "ASB" in scheme and "Fund" not in scheme:
                    break
                continue

            parsed.append(
                {
                    "scheme": scheme,
                    "unit_price": price,
                    "date": target_date,
                }
            )

        return parsed

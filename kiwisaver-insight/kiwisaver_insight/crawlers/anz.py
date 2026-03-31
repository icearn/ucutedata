from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.base import BaseCrawler
from kiwisaver_insight.utils.http_helpers import create_session


class ANZCrawler(BaseCrawler):
    """Crawler for public ANZ KiwiSaver unit-price APIs."""

    report_name = "ANZUnitprices"
    scheme_heading = "ANZ KiwiSaver Scheme"

    def __init__(self):
        super().__init__("ANZ")
        self.session = create_session(timeout=settings.asb_timeout_seconds)
        self.funds_url = settings.anz_funds_url
        self.history_url = settings.anz_historical_unit_price_url
        self._fund_codes: Dict[str, str] | None = None

    def fetch_prices(self) -> List[Dict]:
        today = date.today()
        month_start = today.replace(day=1)
        return self.fetch_history("High Growth Fund", month_start, today)

    def fetch_history(self, fund_name: str, start_date: date, end_date: date) -> List[Dict]:
        if start_date > end_date:
            raise ValueError("start_date must be before end_date")

        fund_code = self._get_fund_code(fund_name)
        response = self.session.get(
            self.history_url,
            params={
                "fromDate": start_date.strftime("%d/%m/%Y"),
                "toDate": end_date.strftime("%d/%m/%Y"),
                "fund": fund_code,
                "reportName": self.report_name,
            },
        )
        response.raise_for_status()
        payload = response.json()

        rows: List[Dict] = []
        for item in payload.get("data", []):
            if item.get("columnHeading") != self.scheme_heading:
                continue
            price_date_text = item.get("fundExitValueDate")
            price_text = item.get("fundExitValue") or item.get("fundEntryValue")
            if not price_date_text or not price_text:
                continue

            rows.append(
                {
                    "scheme": item["fundDescription"],
                    "unit_price": float(Decimal(price_text.replace("$", "").replace(",", "").strip())),
                    "date": datetime.strptime(price_date_text, "%d/%m/%Y").date(),
                }
            )

        rows.sort(key=lambda row: row["date"])
        return rows

    def _get_fund_code(self, fund_name: str) -> str:
        if self._fund_codes is None:
            response = self.session.get(self.funds_url)
            response.raise_for_status()
            payload = response.json()
            self._fund_codes = {}
            for group in payload.get("data", []):
                if group.get("heading") != self.scheme_heading:
                    continue
                for option in group.get("fundOptionsList", []):
                    self._fund_codes[option["fundName"]] = option["fundCode"]

        fund_code = self._fund_codes.get(fund_name) if self._fund_codes else None
        if not fund_code:
            raise ValueError(f"Unable to find ANZ fund code for {fund_name}")
        return fund_code

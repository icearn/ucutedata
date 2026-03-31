from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO
from typing import Dict, List

from pypdf import PdfReader

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.base import BaseCrawler
from kiwisaver_insight.utils.http_helpers import create_session


class WestpacCrawler(BaseCrawler):
    """Crawler for Westpac unit prices published in the latest PDF."""

    def __init__(self):
        super().__init__("Westpac")
        self.session = create_session(timeout=settings.asb_timeout_seconds)
        self.unit_price_pdf_url = settings.westpac_unit_price_pdf_url

    def fetch_prices(self) -> List[Dict]:
        response = self.session.get(self.unit_price_pdf_url)
        response.raise_for_status()
        return self._parse_pdf(response.content)

    def _parse_pdf(self, pdf_bytes: bytes) -> List[Dict]:
        reader = PdfReader(BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return self._parse_text(text)

    def _parse_text(self, text: str) -> List[Dict]:
        date_match = re.search(r"Exit Unit Price as at\s+((?:\d{2}/\d{2}/\d{4}\s+)+)", text)
        if not date_match:
            raise ValueError("Unable to find Westpac price dates in PDF")

        price_dates = [
            datetime.strptime(value, "%d/%m/%Y").date()
            for value in re.findall(r"\d{2}/\d{2}/\d{4}", date_match.group(1))
        ]

        if "Westpac KiwiSaver Scheme" not in text or "Westpac Active Series" not in text:
            raise ValueError("Unable to isolate Westpac KiwiSaver scheme section in PDF")

        section = text.split("Westpac KiwiSaver Scheme", 1)[1].split("Westpac Active Series", 1)[0]
        rows: List[Dict] = []

        for raw_line in section.splitlines():
            line = " ".join(raw_line.split())
            if not line:
                continue

            value_match = re.search(r"\d+\.\d{4}", line)
            if not value_match:
                continue

            prices = [float(value) for value in re.findall(r"\d+\.\d{4}", line)]
            if len(prices) != len(price_dates):
                continue

            scheme = line[: value_match.start()].replace("^", "").strip()
            for price_date, unit_price in zip(price_dates, prices):
                rows.append(
                    {
                        "scheme": scheme,
                        "unit_price": unit_price,
                        "date": price_date,
                    }
                )

        rows.sort(key=lambda row: (row["scheme"], row["date"]))
        return rows

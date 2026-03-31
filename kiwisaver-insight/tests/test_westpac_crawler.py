from datetime import date

from kiwisaver_insight.crawlers.westpac import WestpacCrawler


def test_westpac_crawler_parses_high_growth_row():
    crawler = WestpacCrawler()
    text = """
Exit Unit Price Information
Exit Unit Price as at 30/03/2026 27/03/2026 26/03/2026 25/03/2026 24/03/2026
Westpac KiwiSaver Scheme
Cash Fund 1.7483 1.7478 1.7478 1.7476 1.7475
High Growth Fund^^ 1.1127 1.1193 1.1307 1.1419 1.1281
Westpac Active Series
"""

    rows = crawler._parse_text(text)

    assert [row for row in rows if row["scheme"] == "High Growth Fund"] == [
        {"scheme": "High Growth Fund", "unit_price": 1.1281, "date": date(2026, 3, 24)},
        {"scheme": "High Growth Fund", "unit_price": 1.1419, "date": date(2026, 3, 25)},
        {"scheme": "High Growth Fund", "unit_price": 1.1307, "date": date(2026, 3, 26)},
        {"scheme": "High Growth Fund", "unit_price": 1.1193, "date": date(2026, 3, 27)},
        {"scheme": "High Growth Fund", "unit_price": 1.1127, "date": date(2026, 3, 30)},
    ]

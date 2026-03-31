from datetime import date

from kiwisaver_insight.crawlers.anz import ANZCrawler


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_anz_crawler_fetch_history_parses_kiwisaver_rows(monkeypatch):
    crawler = ANZCrawler()

    responses = [
        FakeResponse(
            {
                "data": [
                    {
                        "heading": "ANZ KiwiSaver Scheme",
                        "fundOptionsList": [{"fundName": "High Growth Fund", "fundCode": "FKHG"}],
                    }
                ]
            }
        ),
        FakeResponse(
            {
                "data": [
                    {
                        "columnHeading": "ANZ KiwiSaver Scheme",
                        "fundDescription": "High Growth Fund",
                        "fundExitValue": "$1.2513",
                        "fundExitValueDate": "19/03/2026",
                    },
                    {
                        "columnHeading": "ANZ KiwiSaver Scheme",
                        "fundDescription": "High Growth Fund",
                        "fundExitValue": "$1.2356",
                        "fundExitValueDate": "20/03/2026",
                    },
                ]
            }
        ),
    ]

    def fake_get(*args, **kwargs):
        return responses.pop(0)

    monkeypatch.setattr(crawler.session, "get", fake_get)

    rows = crawler.fetch_history("High Growth Fund", date(2026, 3, 19), date(2026, 3, 20))

    assert rows == [
        {"scheme": "High Growth Fund", "unit_price": 1.2513, "date": date(2026, 3, 19)},
        {"scheme": "High Growth Fund", "unit_price": 1.2356, "date": date(2026, 3, 20)},
    ]

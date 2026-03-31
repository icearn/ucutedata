from datetime import date

from kiwisaver_insight.services import aggressive_funds_service


def test_current_aggressive_prices_uses_latest_two_points(monkeypatch):
    sample_rows = [
        {
            "provider": "ASB",
            "scheme": "Aggressive Fund",
            "display_name": "ASB KiwiSaver Aggressive Fund",
            "unit_price": 1.3600,
            "date": date(2026, 3, 27),
        },
        {
            "provider": "ASB",
            "scheme": "Aggressive Fund",
            "display_name": "ASB KiwiSaver Aggressive Fund",
            "unit_price": 1.3643,
            "date": date(2026, 3, 30),
        },
        {
            "provider": "ANZ",
            "scheme": "High Growth Fund",
            "display_name": "ANZ KiwiSaver High Growth Fund",
            "unit_price": 1.2195,
            "date": date(2026, 3, 26),
        },
        {
            "provider": "ANZ",
            "scheme": "High Growth Fund",
            "display_name": "ANZ KiwiSaver High Growth Fund",
            "unit_price": 1.2260,
            "date": date(2026, 3, 27),
        },
        {
            "provider": "Westpac",
            "scheme": "High Growth Fund",
            "display_name": "Westpac KiwiSaver High Growth Fund",
            "unit_price": 1.1193,
            "date": date(2026, 3, 27),
        },
        {
            "provider": "Westpac",
            "scheme": "High Growth Fund",
            "display_name": "Westpac KiwiSaver High Growth Fund",
            "unit_price": 1.1127,
            "date": date(2026, 3, 30),
        },
    ]

    monkeypatch.setattr(
        aggressive_funds_service,
        "collect_aggressive_unit_prices",
        lambda start_date, end_date, store: sample_rows,
    )

    result = aggressive_funds_service.current_aggressive_prices(lookback_days=30, store=True)

    assert result["funds"] == [
        {
            "provider": "ASB",
            "scheme": "Aggressive Fund",
            "display_name": "ASB KiwiSaver Aggressive Fund",
            "latest_price_date": "2026-03-30",
            "previous_price_date": "2026-03-27",
            "current_unit_price": 1.3643,
            "previous_unit_price": 1.36,
            "unit_change": 0.0043,
            "percent_change": 0.3162,
        },
        {
            "provider": "ANZ",
            "scheme": "High Growth Fund",
            "display_name": "ANZ KiwiSaver High Growth Fund",
            "latest_price_date": "2026-03-27",
            "previous_price_date": "2026-03-26",
            "current_unit_price": 1.226,
            "previous_unit_price": 1.2195,
            "unit_change": 0.0065,
            "percent_change": 0.533,
        },
        {
            "provider": "Westpac",
            "scheme": "High Growth Fund",
            "display_name": "Westpac KiwiSaver High Growth Fund",
            "latest_price_date": "2026-03-30",
            "previous_price_date": "2026-03-27",
            "current_unit_price": 1.1127,
            "previous_unit_price": 1.1193,
            "unit_change": -0.0066,
            "percent_change": -0.5897,
        },
    ]

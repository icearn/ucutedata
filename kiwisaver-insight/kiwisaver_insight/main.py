import argparse
import csv
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List

from kiwisaver_insight.services.asb_service import fetch_history


DATE_FMT = "%Y-%m-%d"


def parse_date(value: str) -> date:
    return datetime.strptime(value, DATE_FMT).date()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="KiwiSaver Insight CLI")
    parser.add_argument("--start-date", type=parse_date, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=parse_date, help="End date (YYYY-MM-DD)")
    parser.add_argument(
        "--days",
        type=int,
        default=0,
        help="Fetch this many days back from today when explicit dates are not provided.",
    )
    parser.add_argument("--store", action="store_true", help="Persist rows to Postgres")
    parser.add_argument(
        "--output",
        choices=["json", "csv"],
        default="json",
        help="Output format for stdout",
    )
    parser.add_argument("--out", type=Path, help="Optional path to save output copy")
    return parser


def write_csv(path: Path, rows: List[dict]):
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = build_parser()
    args = parser.parse_args()

    today = date.today()
    if args.start_date and args.end_date:
        start, end = args.start_date, args.end_date
    elif args.start_date:
        start = args.start_date
        end = args.start_date
    elif args.days:
        end = today
        start = today - timedelta(days=args.days)
    else:
        start = end = today

    data = fetch_history(start, end, store=args.store)

    if args.output == "json":
        payload = json.dumps(data, indent=2)
        print(payload)
        if args.out:
            Path(args.out).write_text(payload, encoding="utf-8")
    else:
        target_path = args.out or Path("kiwisaver_asb_prices.csv")
        write_csv(Path(target_path), data)
        print(f"Saved CSV to {target_path}")


if __name__ == "__main__":
    main()

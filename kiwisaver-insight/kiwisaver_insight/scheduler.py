from __future__ import annotations

import json

from kiwisaver_insight.services.scheduled_crawler_service import run_incremental_crawl
from kiwisaver_insight.utils.db import ensure_runtime_schema


def main():
    ensure_runtime_schema()
    payload = run_incremental_crawl()
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()

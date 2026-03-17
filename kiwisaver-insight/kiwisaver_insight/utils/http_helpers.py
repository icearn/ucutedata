from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Connection": "keep-alive",
}


def create_session(timeout: int = 30) -> requests.Session:
    """Return a configured Requests session with retry/backoff."""

    session = requests.Session()

    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=0.6,
        status=retry_statuses(),
        allowed_methods=("GET", "POST"),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(DEFAULT_HEADERS)
    session.request = _with_default_timeout(session.request, timeout)  # type: ignore
    return session


def retry_statuses() -> tuple[int, ...]:
    return 429, 500, 502, 503, 504


def _with_default_timeout(request_func, timeout):
    def wrapper(method, url, **kwargs):
        kwargs.setdefault("timeout", timeout)
        return request_func(method, url, **kwargs)

    return wrapper

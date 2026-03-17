from importlib.metadata import PackageNotFoundError, version


def get_version() -> str:
    """Return the installed package version if available."""

    try:
        return version("kiwisaver_insight")
    except PackageNotFoundError:  # pragma: no cover - dev env only
        return "dev"


__all__ = ["get_version"]

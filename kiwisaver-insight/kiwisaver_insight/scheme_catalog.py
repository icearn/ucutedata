from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Dict, List


@dataclass(frozen=True)
class TrackedScheme:
    id: str
    provider: str
    scheme: str
    display_name: str
    risk_level: str
    color: str


TRACKED_SCHEMES: List[TrackedScheme] = [
    TrackedScheme(
        id="1",
        provider="ANZ",
        scheme="Conservative Fund",
        display_name="ANZ KiwiSaver Conservative Fund",
        risk_level="Conservative",
        color="#2563eb",
    ),
    TrackedScheme(
        id="13",
        provider="ANZ",
        scheme="Cash Fund",
        display_name="ANZ KiwiSaver Cash Fund",
        risk_level="Cash",
        color="#0f766e",
    ),
    TrackedScheme(
        id="2",
        provider="ANZ",
        scheme="Balanced Growth Fund",
        display_name="ANZ KiwiSaver Balanced Growth Fund",
        risk_level="Balanced",
        color="#4f46e5",
    ),
    TrackedScheme(
        id="3",
        provider="ANZ",
        scheme="Growth Fund",
        display_name="ANZ KiwiSaver Growth Fund",
        risk_level="Growth",
        color="#7c3aed",
    ),
    TrackedScheme(
        id="4",
        provider="ANZ",
        scheme="High Growth Fund",
        display_name="ANZ KiwiSaver High Growth Fund",
        risk_level="Aggressive",
        color="#0ea5e9",
    ),
    TrackedScheme(
        id="5",
        provider="ASB",
        scheme="Conservative Fund",
        display_name="ASB KiwiSaver Conservative Fund",
        risk_level="Conservative",
        color="#16a34a",
    ),
    TrackedScheme(
        id="14",
        provider="ASB",
        scheme="NZ Cash Fund",
        display_name="ASB KiwiSaver NZ Cash Fund",
        risk_level="Cash",
        color="#15803d",
    ),
    TrackedScheme(
        id="6",
        provider="ASB",
        scheme="Moderate Fund",
        display_name="ASB KiwiSaver Moderate Fund",
        risk_level="Balanced",
        color="#14b8a6",
    ),
    TrackedScheme(
        id="7",
        provider="ASB",
        scheme="Growth Fund",
        display_name="ASB KiwiSaver Growth Fund",
        risk_level="Growth",
        color="#f59e0b",
    ),
    TrackedScheme(
        id="8",
        provider="ASB",
        scheme="Aggressive Fund",
        display_name="ASB KiwiSaver Aggressive Fund",
        risk_level="Aggressive",
        color="#f97316",
    ),
    TrackedScheme(
        id="9",
        provider="Westpac",
        scheme="Conservative Fund",
        display_name="Westpac KiwiSaver Conservative Fund",
        risk_level="Conservative",
        color="#991b1b",
    ),
    TrackedScheme(
        id="15",
        provider="Westpac",
        scheme="Cash Fund",
        display_name="Westpac KiwiSaver Cash Fund",
        risk_level="Cash",
        color="#7f1d1d",
    ),
    TrackedScheme(
        id="10",
        provider="Westpac",
        scheme="Balanced Fund",
        display_name="Westpac KiwiSaver Balanced Fund",
        risk_level="Balanced",
        color="#dc2626",
    ),
    TrackedScheme(
        id="11",
        provider="Westpac",
        scheme="Growth Fund",
        display_name="Westpac KiwiSaver Growth Fund",
        risk_level="Growth",
        color="#ef4444",
    ),
    TrackedScheme(
        id="12",
        provider="Westpac",
        scheme="High Growth Fund",
        display_name="Westpac KiwiSaver High Growth Fund",
        risk_level="Aggressive",
        color="#b91c1c",
    ),
]

TRACKED_SCHEMES_BY_ID: Dict[str, TrackedScheme] = {scheme.id: scheme for scheme in TRACKED_SCHEMES}
TRACKED_SCHEMES_BY_NAME: Dict[str, TrackedScheme] = {
    scheme.display_name: scheme for scheme in TRACKED_SCHEMES
}
TRACKED_SCHEME_NAME_ALIASES: Dict[str, str] = {
    "ANZ Default KiwiSaver Scheme": "ANZ KiwiSaver Conservative Fund",
    "ANZ KiwiSaver Balanced Growth": "ANZ KiwiSaver Balanced Growth Fund",
    "ANZ KiwiSaver Growth": "ANZ KiwiSaver Growth Fund",
    "ANZ Conservative Fund": "ANZ KiwiSaver Conservative Fund",
    "ANZ Cash Fund": "ANZ KiwiSaver Cash Fund",
    "ANZ Balanced Growth Fund": "ANZ KiwiSaver Balanced Growth Fund",
    "ANZ Growth Fund": "ANZ KiwiSaver Growth Fund",
    "ANZ High Growth Fund": "ANZ KiwiSaver High Growth Fund",
    "ASB KiwiSaver Conservative": "ASB KiwiSaver Conservative Fund",
    "ASB KiwiSaver NZ Cash": "ASB KiwiSaver NZ Cash Fund",
    "ASB KiwiSaver Moderate": "ASB KiwiSaver Moderate Fund",
    "ASB KiwiSaver Growth": "ASB KiwiSaver Growth Fund",
    "ASB Conservative Fund": "ASB KiwiSaver Conservative Fund",
    "ASB NZ Cash Fund": "ASB KiwiSaver NZ Cash Fund",
    "ASB Cash Fund": "ASB KiwiSaver NZ Cash Fund",
    "ASB Balanced Fund": "ASB KiwiSaver Moderate Fund",
    "ASB KiwiSaver Balanced Fund": "ASB KiwiSaver Moderate Fund",
    "ASB Moderate Fund": "ASB KiwiSaver Moderate Fund",
    "ASB Growth Fund": "ASB KiwiSaver Growth Fund",
    "ASB Aggressive Fund": "ASB KiwiSaver Aggressive Fund",
    "Westpac KiwiSaver Conservative": "Westpac KiwiSaver Conservative Fund",
    "Westpac KiwiSaver Cash": "Westpac KiwiSaver Cash Fund",
    "Westpac KiwiSaver Balanced": "Westpac KiwiSaver Balanced Fund",
    "Westpac KiwiSaver Growth": "Westpac KiwiSaver Growth Fund",
    "Westpac Conservative Fund": "Westpac KiwiSaver Conservative Fund",
    "Westpac Cash Fund": "Westpac KiwiSaver Cash Fund",
    "Westpac Balanced Fund": "Westpac KiwiSaver Balanced Fund",
    "Westpac Growth Fund": "Westpac KiwiSaver Growth Fund",
    "Westpac High Growth Fund": "Westpac KiwiSaver High Growth Fund",
}


def _normalize_scheme_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


TRACKED_SCHEMES_BY_NORMALIZED_NAME: Dict[str, TrackedScheme] = {}
for tracked_scheme in TRACKED_SCHEMES:
    TRACKED_SCHEMES_BY_NORMALIZED_NAME[_normalize_scheme_name(tracked_scheme.display_name)] = tracked_scheme
    TRACKED_SCHEMES_BY_NORMALIZED_NAME[_normalize_scheme_name(f"{tracked_scheme.provider} {tracked_scheme.scheme}")] = tracked_scheme
for alias, canonical_name in TRACKED_SCHEME_NAME_ALIASES.items():
    canonical_scheme = TRACKED_SCHEMES_BY_NAME.get(canonical_name)
    if canonical_scheme is not None:
        TRACKED_SCHEMES_BY_NORMALIZED_NAME[_normalize_scheme_name(alias)] = canonical_scheme


def list_tracked_schemes(provider: str | None = None) -> List[TrackedScheme]:
    if provider is None:
        return list(TRACKED_SCHEMES)
    return [scheme for scheme in TRACKED_SCHEMES if scheme.provider == provider]


def list_tracked_scheme_payloads(provider: str | None = None) -> List[Dict]:
    return [
        {
            "id": scheme.id,
            "name": scheme.display_name,
            "provider": scheme.provider,
            "scheme": scheme.scheme,
            "type": scheme.risk_level,
            "color": scheme.color,
        }
        for scheme in list_tracked_schemes(provider)
    ]


def list_aggressive_tracked_schemes() -> List[TrackedScheme]:
    provider_order = {"ASB": 0, "ANZ": 1, "Westpac": 2}
    schemes = [scheme for scheme in TRACKED_SCHEMES if scheme.risk_level == "Aggressive"]
    return sorted(schemes, key=lambda scheme: provider_order.get(scheme.provider, 99))


def get_tracked_scheme_by_id(scheme_id: str) -> TrackedScheme | None:
    return TRACKED_SCHEMES_BY_ID.get(scheme_id)


def get_tracked_scheme_by_name(display_name: str) -> TrackedScheme | None:
    if display_name in TRACKED_SCHEME_NAME_ALIASES:
        display_name = TRACKED_SCHEME_NAME_ALIASES[display_name]
    return TRACKED_SCHEMES_BY_NAME.get(display_name) or TRACKED_SCHEMES_BY_NORMALIZED_NAME.get(
        _normalize_scheme_name(display_name)
    )

from __future__ import annotations

from dataclasses import dataclass
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

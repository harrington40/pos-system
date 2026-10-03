"""Central configuration for the full end-to-end API sweep.

Everything is environment-driven, so the same suite runs against a throwaway
test database, a local dev backend, or production (read-only) with no edits.

Environment variables
---------------------
OPENRX_API_URL        API base URL including ``/api``
                      (default ``http://localhost:3202/api``)
OPENRX_API_TOKEN      Bearer token. When absent, authenticated tests skip.
OPENRX_API_TIMEOUT    Per-request timeout, seconds (default 20)
OPENRX_E2E_DOMAINS    Comma list of domains to run (default: all),
                      e.g. ``imaging,patients,fhir``
OPENRX_E2E_MAX_MS     Max acceptable response time, ms (default 8000)
OPENRX_E2E_USER       Login username for the flow test (default ``admin``)
OPENRX_E2E_PASSWORD   Login password for the flow test (default ``OpenRxTest123``)
OPENRX_E2E_VERIFY_TLS ``false`` to skip TLS verification (default true)
OPENRX_RUN_WRITES     ``true`` to also exercise curated write flows (default off)
"""
from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_API_URL = "http://localhost:3202/api"


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _csv(name: str, default: str = "") -> frozenset[str]:
    """Parse a comma-separated env var into a set of trimmed values."""
    raw = os.getenv(name, default)
    return frozenset(x.strip() for x in raw.split(",") if x.strip())


#: Endpoints allowed to return 5xx in this environment (known gaps, e.g. a
#: schema column missing from a particular database). Override with
#: ``OPENRX_E2E_KNOWN_5XX``.
DEFAULT_KNOWN_5XX = "GET /patients/:pid/discharge-summary"

#: Endpoints that legitimately answer 2xx with a non-JSON body (external
#: proxies, CCDA XML, ...). Override with ``OPENRX_E2E_NON_JSON``.
DEFAULT_NON_JSON = "GET /fda/transparency"


@dataclass(frozen=True)
class Settings:
    """Resolved, immutable configuration for one test run."""

    api_url: str
    token: str
    timeout: float
    max_ms: int
    domains: tuple[str, ...]
    user: str
    password: str
    run_writes: bool
    verify_tls: bool
    known_5xx: frozenset[str]
    non_json: frozenset[str]

    @property
    def authenticated(self) -> bool:
        return bool(self.token)

    def wants(self, domain: str) -> bool:
        """True when ``domain`` should be exercised in this run."""
        return not self.domains or domain in self.domains

    def url(self, path: str) -> str:
        return f"{self.api_url}{path}"


def load_settings() -> Settings:
    """Build :class:`Settings` from the environment (called once per run)."""
    raw_url = (
        os.getenv("OPENRX_API_URL")
        or os.getenv("OPENRX_BASELINE_API_URL")
        or DEFAULT_API_URL
    )
    domains = tuple(
        d.strip() for d in os.getenv("OPENRX_E2E_DOMAINS", "").split(",") if d.strip()
    )
    return Settings(
        api_url=raw_url.rstrip("/"),
        token=(os.getenv("OPENRX_API_TOKEN") or "").strip(),
        timeout=float(_int("OPENRX_API_TIMEOUT", 20)),
        max_ms=_int("OPENRX_E2E_MAX_MS", 8000),
        domains=domains,
        user=os.getenv("OPENRX_E2E_USER") or os.getenv("OPENRX_TEST_USER") or "admin",
        password=(
            os.getenv("OPENRX_E2E_PASSWORD")
            or os.getenv("OPENRX_TEST_PASSWORD")
            or "OpenRxTest123"
        ),
        run_writes=_bool("OPENRX_RUN_WRITES", False),
        verify_tls=_bool("OPENRX_E2E_VERIFY_TLS", True),
        known_5xx=_csv("OPENRX_E2E_KNOWN_5XX", DEFAULT_KNOWN_5XX),
        non_json=_csv("OPENRX_E2E_NON_JSON", DEFAULT_NON_JSON),
    )

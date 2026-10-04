"""Central configuration for the browser (Playwright) UI tests.

Everything is environment-driven so the same suite runs against the local dev
server, a staging build, or production — no edits required.

Environment variables
---------------------
UI_BASE_URL      SPA origin (the app is served at the site root — no prefix).
                 Dev:   http://localhost:5173
                 Prod:  https://openrx.transtechologies.com
                 (default http://localhost:5173)
UI_API_URL       NestJS API base (used to mint a session). Default
                 http://localhost:3002/api
UI_USER          Username used to obtain a session (default admin)
UI_PASSWORD      Password used to obtain a session (default admin123)
UI_TOKEN         Pre-minted bearer token. When set, no login is attempted and
                 the session uses it directly (handy for CI/prod).
UI_TIMEOUT_MS    Per-action timeout in ms (default 15000)
UI_DOMAINS       Comma list of domains to run (default: all) e.g. "patients,dicom"
UI_NAV_WAIT      Playwright wait state after navigation: load|domcontentloaded|
                 networkidle (default domcontentloaded)
UI_ALLOW_PAGE_ERRORS  "true" to not fail on uncaught page errors
UI_STORAGE_STATE      Optional path to a Playwright storage-state JSON to reuse.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass

DEFAULT_BASE_URL = "http://localhost:5173"
DEFAULT_API_URL = "http://localhost:3002/api"
_ORIGIN_RE = re.compile(r"^(https?://[^/]+)")


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


def origin_of(url: str) -> str:
    """Return the scheme://host part of ``url`` (no trailing slash)."""
    match = _ORIGIN_RE.match(url)
    return match.group(1) if match else url


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_url: str
    user: str
    password: str
    token: str
    timeout_ms: int
    nav_wait: str
    domains: tuple[str, ...]
    allow_page_errors: bool
    storage_state: str

    @property
    def origin(self) -> str:
        return origin_of(self.base_url)

    def wants(self, domain: str) -> bool:
        return not self.domains or domain in self.domains


def load_settings() -> Settings:
    domains = tuple(
        d.strip() for d in os.getenv("UI_DOMAINS", "").split(",") if d.strip()
    )
    return Settings(
        base_url=(os.getenv("UI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/"),
        api_url=(os.getenv("UI_API_URL") or DEFAULT_API_URL).rstrip("/"),
        user=os.getenv("UI_USER") or "admin",
        password=os.getenv("UI_PASSWORD") or "admin123",
        token=(os.getenv("UI_TOKEN") or "").strip(),
        timeout_ms=_int("UI_TIMEOUT_MS", 15000),
        nav_wait=os.getenv("UI_NAV_WAIT") or "domcontentloaded",
        domains=domains,
        allow_page_errors=_bool("UI_ALLOW_PAGE_ERRORS", False),
        storage_state=(os.getenv("UI_STORAGE_STATE") or "").strip(),
    )

"""Authentication helpers — mint a session and expose it as a Playwright state.

The SPA authenticates by POSTing ``/auth/login`` and storing the returned
``{token, user}`` in ``localStorage['openemr_user']`` (see ``useAuth`` /
``LoginPage``). UI tests therefore do not need to drive the login form for every
case: they seed that storage entry and navigate straight to the page. A dedicated
test (``test_auth_ui.py``) still exercises the real form.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import requests

from config import Settings

STORAGE_KEY = "openemr_user"


@dataclass(frozen=True)
class Session:
    username: str
    display_name: str
    role: str
    token: str

    def as_user(self) -> dict:
        return {
            "username": self.username,
            "displayName": self.display_name,
            "role": self.role,
            "token": self.token,
        }


def obtain_session(settings: Settings) -> Session | None:
    """Return a usable :class:`Session`, or ``None`` if none can be obtained."""
    if settings.token:
        return Session(settings.user, settings.user, "admin", settings.token)

    try:
        response = requests.post(
            f"{settings.api_url}/auth/login",
            json={"username": settings.user, "password": settings.password},
            timeout=15,
        )
    except requests.RequestException:
        return None

    if not response.ok:
        return None
    body = response.json()
    token = body.get("token")
    if not token:
        return None
    user = body.get("user") or {}
    return Session(
        username=user.get("username") or settings.user,
        display_name=user.get("displayName") or settings.user,
        role=user.get("role") or "admin",
        token=token,
    )


def storage_state(settings: Settings) -> dict | None:
    """Build a Playwright storage-state dict that logs the app in.

    Returns ``None`` when no session can be obtained (authenticated tests then
    skip). A caller-provided ``UI_STORAGE_STATE`` file is passed through as-is.
    """
    if settings.storage_state:
        path = Path(settings.storage_state)
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
        return None

    session = obtain_session(settings)
    if not session:
        return None

    return {
        "cookies": [],
        "origins": [
            {
                "origin": settings.origin,
                "localStorage": [
                    {"name": STORAGE_KEY, "value": json.dumps(session.as_user())}
                ],
            }
        ],
    }

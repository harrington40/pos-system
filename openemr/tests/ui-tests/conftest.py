"""Fixtures and route-driven parametrization for the UI tests.

Relies on ``pytest-playwright`` for the ``browser``/``context``/``page``
fixtures, and overrides ``browser_context_args`` to (a) point at the configured
base URL and (b) seed the app's ``localStorage`` session so authenticated pages
render without driving the login form every time.
"""
from __future__ import annotations

import pytest

from auth import storage_state
from config import load_settings
from routes import navigable_routes


@pytest.fixture(scope="session")
def ui_settings():
    return load_settings()


@pytest.fixture(scope="session")
def session_state(ui_settings):
    """Playwright storage-state dict (or None when no session is available)."""
    return storage_state(ui_settings)


@pytest.fixture
def browser_context_args(browser_context_args, ui_settings, session_state):
    args = {
        **browser_context_args,
        "base_url": ui_settings.base_url,
        "viewport": {"width": 1440, "height": 900},
        "ignore_https_errors": True,
    }
    if session_state:
        args["storage_state"] = session_state
    return args


@pytest.fixture
def anon_context(browser, ui_settings):
    """A fresh, unauthenticated context — for login / redirect tests."""
    context = browser.new_context(
        base_url=ui_settings.base_url,
        viewport={"width": 1440, "height": 900},
        ignore_https_errors=True,
    )
    yield context
    context.close()


@pytest.fixture
def anon_page(anon_context):
    return anon_context.new_page()


def pytest_generate_tests(metafunc) -> None:
    """Parametrize the smoke sweep: one case per navigable route."""
    if "route" not in metafunc.fixturenames:
        return
    settings = load_settings()
    cases = navigable_routes(settings.domains)
    metafunc.parametrize("route", cases, ids=[r.path for r in cases])

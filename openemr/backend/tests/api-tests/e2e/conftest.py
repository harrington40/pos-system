"""Fixtures and dynamic parametrization for the full API sweep.

``pytest_generate_tests`` turns the route catalog into per-endpoint test cases,
so every route in the app becomes an individual, individually-reportable test.
The subset each test receives is chosen by test name, and the whole catalog is
filtered by ``OPENRX_E2E_DOMAINS`` for focused runs.
"""
from __future__ import annotations

import pathlib
import sys

import pytest
import requests

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from config import load_settings  # noqa: E402
from endpoints import build_catalog  # noqa: E402


def pytest_generate_tests(metafunc) -> None:
    if "endpoint" not in metafunc.fixturenames:
        return

    settings = load_settings()
    catalog = [e for e in build_catalog() if settings.wants(e.domain)]

    selectors = {
        # anonymous GET to every public read route (safe by default)
        "test_public_read_answers": lambda e: not e.auth_required and e.is_read,
        # anonymous POST to every public write route (side-effect risk → gated)
        "test_public_write_rejects_empty_input": lambda e: not e.auth_required and not e.is_read,
        # authenticated GET to every protected read route
        "test_authenticated_read_has_no_server_error": lambda e: e.auth_required and e.is_read,
        "test_authenticated_read_is_timely": lambda e: e.auth_required and e.is_read,
        # an anonymous caller must be rejected by every protected write route
        "test_write_endpoint_requires_auth": lambda e: e.auth_required and not e.is_read,
    }

    selector = selectors.get(metafunc.function.__name__)
    if selector is None:
        return

    params = [e for e in catalog if selector(e)]
    metafunc.parametrize("endpoint", params, ids=[e.id for e in params])


@pytest.fixture(scope="session")
def e2e_settings():
    return load_settings()


@pytest.fixture(scope="session")
def full_catalog():
    """The complete, unfiltered endpoint catalog (for integrity checks)."""
    return build_catalog()


@pytest.fixture(scope="session")
def catalog(e2e_settings):
    """The domain-filtered endpoint catalog for this run (used by the sweep)."""
    return [e for e in build_catalog() if e2e_settings.wants(e.domain)]


def _new_session(token: str, verify: bool) -> requests.Session:
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    if token:
        session.headers["Authorization"] = f"Bearer {token}"
    session.verify = verify
    return session


@pytest.fixture(scope="session")
def authed_session(e2e_settings):
    session = _new_session(e2e_settings.token, e2e_settings.verify_tls)
    yield session
    session.close()


@pytest.fixture(scope="session")
def anon_session(e2e_settings):
    session = _new_session("", e2e_settings.verify_tls)
    yield session
    session.close()

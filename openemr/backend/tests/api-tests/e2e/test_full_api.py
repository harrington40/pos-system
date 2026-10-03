"""Full end-to-end API sweep — every route the app exposes, one test case each.

Cases are generated from the app's route inventory (see ``endpoints.py``) and
grouped by feature domain. Configuration is environment-driven (see
``config.py`` / ``README.md``).

Common invocations::

    pytest e2e/                                   # whole API
    pytest e2e/ -k public                         # only public endpoints
    OPENRX_E2E_DOMAINS=imaging,patients pytest e2e/
    OPENRX_API_URL=https://openrx.transtechologies.com/api \
        OPENRX_API_TOKEN=... pytest e2e/
"""
from __future__ import annotations

import pytest
import requests

pytestmark = pytest.mark.e2e

#: Route pairs the backend legitimately registers twice (Nest keeps the first).
KNOWN_DUPLICATE_ROUTES = {
    "GET /patients/:pid/allergies",
    "GET /patients/:pid/medications",
}


def _call(session, endpoint, settings):
    """Issue the endpoint's request with a minimal, well-formed payload.

    Write methods get an empty JSON object so the handler runs (and returns a
    client error for missing fields) instead of a body-parser 500.
    """
    kwargs = {"timeout": settings.timeout}
    if endpoint.method in ("POST", "PUT", "PATCH"):
        kwargs["json"] = {}
    return session.request(endpoint.method, endpoint.url(settings.api_url), **kwargs)


# --------------------------------------------------------------------------- #
# Catalog integrity — fast, offline; proves the sweep covers the whole app
# --------------------------------------------------------------------------- #

def test_catalog_is_substantial(full_catalog):
    assert len(full_catalog) > 100, f"route catalog looks incomplete ({len(full_catalog)})"
    domains = {e.domain for e in full_catalog}
    assert len(domains) >= 20, f"expected many feature domains, got {sorted(domains)}"


def test_catalog_has_no_unexpected_duplicates(full_catalog):
    ids = [e.id for e in full_catalog]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert dupes <= KNOWN_DUPLICATE_ROUTES, f"duplicate routes: {sorted(dupes)}"


def test_catalog_spans_expected_core_domains(full_catalog):
    present = {e.domain for e in full_catalog}
    missing = {"imaging", "patients", "auth", "fhir", "billing"} - present
    assert not missing, f"core domains missing from the app: {sorted(missing)}"


def test_catalog_methods_are_known(full_catalog):
    allowed = {"GET", "POST", "PUT", "PATCH", "DELETE"}
    bad = [e.id for e in full_catalog if e.method not in allowed]
    assert not bad, f"unexpected HTTP methods: {bad}"


# --------------------------------------------------------------------------- #
# Parametrized sweep — one case per route (subsets chosen in conftest.py)
# --------------------------------------------------------------------------- #

def test_public_read_answers(endpoint, anon_session, e2e_settings):
    """Public read routes must answer and never surface a 5xx."""
    r = _call(anon_session, endpoint, e2e_settings)
    assert r.status_code < 500, f"{endpoint.id} -> {r.status_code}\n{r.text[:300]}"


def test_public_write_rejects_empty_input(endpoint, anon_session, e2e_settings):
    """Public write routes must reject an empty body with a client error, not 5xx.

    Skipped unless ``OPENRX_RUN_WRITES=true`` because these endpoints can mutate
    server state — point it at a throwaway database, never production.
    """
    if not e2e_settings.run_writes:
        pytest.skip("public writes are side-effecting; set OPENRX_RUN_WRITES=true to run")
    r = _call(anon_session, endpoint, e2e_settings)
    assert r.status_code < 500, f"{endpoint.id} -> {r.status_code}\n{r.text[:300]}"


def test_authenticated_read_has_no_server_error(endpoint, authed_session, e2e_settings):
    """A valid caller must never get a 5xx, and a 2xx body must be JSON."""
    if not e2e_settings.authenticated:
        pytest.skip("OPENRX_API_TOKEN not set")
    r = authed_session.get(endpoint.url(e2e_settings.api_url), timeout=e2e_settings.timeout)
    if endpoint.id in e2e_settings.known_5xx:
        pytest.xfail(f"known server-error gap: {endpoint.id} -> {r.status_code}")
    assert r.status_code < 500, f"{endpoint.id} -> {r.status_code}\n{r.text[:300]}"
    if r.status_code < 300 and r.content and endpoint.id not in e2e_settings.non_json:
        ctype = r.headers.get("content-type", "")
        assert "json" in ctype, f"{endpoint.id} returned 2xx with content-type={ctype!r}"


def test_authenticated_read_is_timely(endpoint, authed_session, e2e_settings):
    if not e2e_settings.authenticated:
        pytest.skip("OPENRX_API_TOKEN not set")
    r = authed_session.get(endpoint.url(e2e_settings.api_url), timeout=e2e_settings.timeout)
    ms = r.elapsed.total_seconds() * 1000
    assert ms <= e2e_settings.max_ms, f"{endpoint.id} took {ms:.0f} ms (> {e2e_settings.max_ms})"


def test_write_endpoint_requires_auth(endpoint, anon_session, e2e_settings):
    """Every guarded write route rejects an anonymous caller (guard precedes handler)."""
    r = anon_session.request(
        endpoint.method, endpoint.url(e2e_settings.api_url), timeout=e2e_settings.timeout
    )
    assert r.status_code in (401, 403), f"{endpoint.id} allowed anonymous ({r.status_code})"


# --------------------------------------------------------------------------- #
# Cross-cutting behavior
# --------------------------------------------------------------------------- #

def test_config_is_public_and_well_formed(anon_session, e2e_settings):
    r = anon_session.get(e2e_settings.url("/config"), timeout=e2e_settings.timeout)
    assert r.status_code == 200
    body = r.json()
    assert body.get("appName") and body.get("version"), f"unexpected /config: {body}"


def test_unknown_route_is_404(anon_session, e2e_settings):
    r = anon_session.get(e2e_settings.url("/__no_such_route__"), timeout=e2e_settings.timeout)
    assert r.status_code == 404


def test_protected_route_rejects_a_garbage_token(e2e_settings):
    with requests.Session() as s:
        s.headers.update({"Authorization": "Bearer not-a-real-token", "Accept": "application/json"})
        s.verify = e2e_settings.verify_tls
        r = s.get(e2e_settings.url("/patients"), timeout=e2e_settings.timeout)
    assert r.status_code in (401, 403), f"garbage token was accepted ({r.status_code})"


def test_login_flow_issues_a_usable_token(e2e_settings):
    """End-to-end: log in, then use the returned token on a protected route."""
    r = requests.post(
        e2e_settings.url("/auth/login"),
        json={"username": e2e_settings.user, "password": e2e_settings.password},
        timeout=e2e_settings.timeout,
        verify=e2e_settings.verify_tls,
    )
    if r.status_code != 200:
        pytest.skip(f"login unavailable with configured credentials ({r.status_code})")
    token = r.json().get("token")
    assert token, "login response has no token"
    with requests.Session() as s:
        s.headers.update({"Authorization": f"Bearer {token}", "Accept": "application/json"})
        s.verify = e2e_settings.verify_tls
        ok = s.get(e2e_settings.url("/patients"), timeout=e2e_settings.timeout)
    assert ok.status_code == 200, f"token rejected by /patients ({ok.status_code})"

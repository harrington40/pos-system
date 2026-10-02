"""Production read-only discovery tests (``discovery/`` package).

These tests do two jobs:

* they validate the *fixtures that were already discovered* — that the file is
  present, holds usable identifiers and contains no patient information;
* when ``OPENRX_RUN_DISCOVERY=true`` and credentials are configured, they run a
  fresh discovery against the configured API, assert the baseline answers, and
  refresh ``fixtures/production_discovery.json``.

Nothing here writes to the API. Selected with ``pytest -m discovery`` and
skipped from the domain runs with ``pytest -m "not discovery"``.
"""

from __future__ import annotations

import os
import re

import pytest

from discovery.discovery import (
    DEFAULT_OUTPUT,
    FIXTURE_ENV,
    READ_ONLY_METHODS,
    ProductionDiscovery,
    load_fixtures,
    response_shape,
    write_fixtures,
)

#: Type names a sanitized structure is allowed to end in.
STRUCTURE_LEAVES = {"int", "str", "bool", "NoneType", "float", "list", "dict"}

#: Patterns that must never appear in a persisted structure/identifier block.
PHI_PATTERNS = (
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+"),  # email
    re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"),  # US phone number
)


@pytest.fixture(scope="module")
def discovery_fixtures():
    """The committed fixture file, or a skip when discovery has never run."""
    data = load_fixtures(DEFAULT_OUTPUT)
    if not data:
        pytest.skip(
            f"{DEFAULT_OUTPUT.name} not found; run discovery/run_discovery.py first"
        )
    return data


def _leaves(node, key=None):
    """Yield ``(key, scalar)`` for every scalar leaf in a nested structure."""
    if isinstance(node, dict):
        for child_key, value in node.items():
            yield from _leaves(value, child_key)
    elif isinstance(node, list):
        for value in node:
            yield from _leaves(value, key)
    else:
        yield key, node


@pytest.mark.discovery
@pytest.mark.readonly
def test_recorded_structures_are_type_names_only(discovery_fixtures):
    """Every persisted structure leaf must be a type name or a row count.

    A list is recorded as ``{"kind": "list", "length": <int>, "item": <shape>}``,
    so ``length`` legitimately holds an integer. Anything else must be a type
    name, otherwise a raw response value leaked into the fixture.
    """
    for endpoint, observation in discovery_fixtures["baseline"].items():
        for key, leaf in _leaves(observation.get("structure")):
            if key == "length":
                assert isinstance(leaf, int), f"{endpoint}: length is not an int"
                continue
            assert leaf is None or leaf in STRUCTURE_LEAVES, (
                f"{endpoint} persisted the value {leaf!r}; discovery must only "
                "record field names and primitive types"
            )


@pytest.mark.discovery
@pytest.mark.readonly
def test_fixture_file_has_no_phi(discovery_fixtures):
    """Identifiers/structures must not contain emails, phones or free text."""
    import json

    scanned = json.dumps(
        {
            "fixtures": discovery_fixtures.get("fixtures", {}),
            "baseline": discovery_fixtures.get("baseline", {}),
            "database": discovery_fixtures.get("database", {}),
        }
    )
    for pattern in PHI_PATTERNS:
        assert not pattern.search(scanned), (
            f"fixture file matches {pattern.pattern!r}; a raw payload leaked into "
            "the sanitized output"
        )


@pytest.mark.discovery
@pytest.mark.readonly
def test_database_structure_is_recorded(discovery_fixtures):
    """The fixtures fingerprint the *app's* live database, not a local copy.

    Discovery reads ``/db-admin/tables`` and ``/db-admin/describe/patient_data``
    so the baseline can tell which database the app is really using. A
    non-admin token yields no structure, and the test skips rather than fails.
    """
    database = discovery_fixtures.get("database") or {}
    tables = database.get("tables") or {}
    if not tables:
        pytest.skip("database introspection was unavailable (non-admin token)")

    for required in (
        "patient_data",
        "form_encounter",
        "users",
        "openemr_postcalendar_events",
    ):
        assert required in tables, f"{required} missing from the app database"

    assert all(isinstance(count, int) for count in tables.values())
    assert "pid" in (database.get("patient_data_columns") or [])


@pytest.mark.discovery
@pytest.mark.readonly
def test_fixture_identifiers_are_usable(discovery_fixtures):
    """Every discovered identifier is a positive integer."""
    fixtures = discovery_fixtures.get("fixtures", {})
    assert set(fixtures) == set(FIXTURE_ENV), "fixture keys changed; update FIXTURE_ENV"

    for key, value in fixtures.items():
        if value is None:
            continue
        assert isinstance(value, int) and value > 0, f"{key} is not a positive id: {value!r}"


@pytest.mark.discovery
@pytest.mark.readonly
def test_env_block_matches_fixtures(discovery_fixtures):
    """The ``env`` block conftest consumes is exactly the discovered identifiers."""
    expected = {
        env_key: str(discovery_fixtures["fixtures"][key])
        for key, env_key in FIXTURE_ENV.items()
        if discovery_fixtures["fixtures"].get(key)
    }
    assert discovery_fixtures.get("env") == expected


@pytest.mark.discovery
@pytest.mark.readonly
def test_baseline_core_endpoints_were_reached(discovery_fixtures):
    """The baseline must have reached the core read surface, not just /config."""
    baseline = discovery_fixtures.get("baseline", {})
    assert baseline, "no baseline endpoints recorded"

    for required in ("/config", "/patients?limit=1", "/appointments", "/providers"):
        assert required in baseline, f"{required} missing from the baseline"

    for path, observation in baseline.items():
        status = observation.get("status")
        assert status is None or status < 500, f"{path} returned a server error ({status})"


@pytest.mark.discovery
@pytest.mark.readonly
def test_discovery_only_uses_get():
    """Discovery is read-only by construction (guards against future edits)."""
    assert READ_ONLY_METHODS == {"GET", "HEAD"}
    source = (DEFAULT_OUTPUT.parent.parent / "discovery" / "discovery.py").read_text(
        encoding="utf-8"
    )
    assert 'method = "GET"' in source


@pytest.mark.discovery
@pytest.mark.readonly
def test_response_shape_strips_scalar_values():
    """``response_shape`` returns types, never the values themselves."""
    shaped = response_shape(
        {"pid": 34, "fname": "ShouldNotAppear", "items": [{"drug": "Aspirin"}]}
    )
    assert shaped == {
        "pid": "int",
        "fname": "str",
        "items": {"kind": "list", "length": 1, "item": {"drug": "str"}},
    }



@pytest.mark.discovery
@pytest.mark.readonly
def test_refresh_discovery_baseline():
    """Optionally run a fresh discovery and rewrite the sanitized fixtures.

    Skipped unless ``OPENRX_RUN_DISCOVERY=true`` and a token is configured, so a
    normal ``pytest`` run never touches a live system.
    """
    if os.getenv("OPENRX_RUN_DISCOVERY", "").lower() != "true":
        pytest.skip("set OPENRX_RUN_DISCOVERY=true to refresh discovered fixtures")

    token = os.getenv("OPENRX_API_TOKEN")
    if not token:
        pytest.skip("OPENRX_API_TOKEN is not configured")

    import requests

    base_url = os.getenv("OPENRX_API_URL", "http://localhost:3202/api").rstrip("/")
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )

    result = ProductionDiscovery(session, base_url).run()

    assert result.fixtures["patient_id"], "discovery found no patient"
    for path, observation in result.baseline.items():
        assert observation.status is None or observation.status < 500, (
            f"{path} returned a server error during discovery "
            f"({observation.status})"
        )

    write_fixtures(result)


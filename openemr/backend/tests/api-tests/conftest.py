import json
import os
import pathlib
from urllib.parse import urlparse

import pytest
import requests

#: Hosts that are the live / "main server". Pointing a run at any of these reads
#: real patient data, so it must be a deliberate choice: set
#: ``OPENRX_ALLOW_PRODUCTION=true``. See README.md ("Production access").
_PRODUCTION_HOSTS = frozenset({
    "openrx.transtechologies.com",
    "94.250.201.58",
})


def _assert_not_production(url: str) -> None:
    """Fail closed when a run targets the live/main server without opt-in."""
    if (urlparse(url).hostname or "").lower() not in _PRODUCTION_HOSTS:
        return
    if os.getenv("OPENRX_ALLOW_PRODUCTION", "").strip().lower() in {"1", "true", "yes", "on"}:
        return
    raise RuntimeError(
        f"refusing to run against the live server ({url}): the API suite must "
        f"not read main-server data. Point OPENRX_API_URL at the throwaway test "
        f"backend (http://localhost:3202/api), or set "
        f"OPENRX_ALLOW_PRODUCTION=true to override on purpose (read-only). "
        f"See backend/tests/api-tests/README.md."
    )

#: Sanitized identifiers discovered from a real backend by
#: ``discovery/run_discovery.py``. When present, they seed the ``OPENRX_TEST_*``
#: variables so the data-dependent tests run instead of skipping. Real
#: environment variables always win — the file is only a fallback.
_FIXTURES_FILE = pathlib.Path(__file__).resolve().parent / "fixtures" / "production_discovery.json"


def _load_discovered_fixtures() -> dict:
    try:
        return json.loads(_FIXTURES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


DISCOVERED_FIXTURES = _load_discovered_fixtures()

#: Only seed the discovered identifiers when the suite is pointed at the very
#: API the fixtures came from. Otherwise a local/test-database run — which is
#: seeded with its own ids — would silently be handed production row ids.
_CONFIGURED_API_URL = os.getenv("OPENRX_API_URL", "").rstrip("/")
_DISCOVERED_API_URL = str(DISCOVERED_FIXTURES.get("api_url", "")).rstrip("/")

if _DISCOVERED_API_URL and _CONFIGURED_API_URL == _DISCOVERED_API_URL:
    for _env_key, _env_value in (DISCOVERED_FIXTURES.get("env") or {}).items():
        if _env_value and _env_key not in os.environ:
            os.environ[_env_key] = str(_env_value)



@pytest.fixture(scope="session")
def base_url():
    """API base URL, including the ``/api`` prefix.

    Defaults to the local backend that ``test-db/run-backend-against-test-db.sh``
    starts. It deliberately does NOT default to production: this suite should
    never be one forgotten environment variable away from exercising real
    patient data. Point ``OPENRX_API_URL`` at production only on purpose.
    """
    url = os.getenv(
        "OPENRX_API_URL",
        "http://localhost:3202/api",
    ).rstrip("/")
    _assert_not_production(url)
    return url


@pytest.fixture(scope="session")
def api_session():
    session = requests.Session()
    session.headers.update({
        "Accept": "application/json",
        "Content-Type": "application/json",
    })

    yield session
    session.close()


@pytest.fixture(scope="session")
def auth_token():
    token = os.getenv("OPENRX_API_TOKEN")

    if not token:
        pytest.skip(
            "OPENRX_API_TOKEN is not configured; authenticated tests are disabled"
        )

    return token


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {
        "Authorization": f"Bearer {auth_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def env_or_skip(name: str, description: str) -> str:
    """Return ``name`` from the environment, or skip the test.

    Authenticated tests need real identifiers (a patient, an encounter, a
    report) that cannot be invented. Rather than hard-coding production ids,
    the ids are supplied via environment variables and the tests skip when the
    environment has not been seeded.
    """
    value = os.getenv(name)

    if not value:
        pytest.skip(f"{description} not configured ({name})")

    return value


@pytest.fixture(scope="session")
def patient_id():
    return env_or_skip("OPENRX_TEST_PATIENT_ID", "test patient id")


@pytest.fixture(scope="session")
def patient_record_id():
    """``patient_data.id`` (row id) — distinct from ``pid``; used by ``/patients/:id``."""
    return env_or_skip("OPENRX_TEST_PATIENT_RECORD_ID", "test patient record id")


@pytest.fixture(scope="session")
def encounter_id():
    return env_or_skip("OPENRX_TEST_ENCOUNTER_ID", "test encounter id")


@pytest.fixture(scope="session")
def appointment_id():
    return env_or_skip("OPENRX_TEST_APPOINTMENT_ID", "test appointment id")


@pytest.fixture(scope="session")
def document_id():
    return env_or_skip("OPENRX_TEST_DOCUMENT_ID", "test document id")


@pytest.fixture(scope="session")
def lab_report_id():
    return env_or_skip("OPENRX_TEST_LAB_REPORT_ID", "test lab report id")


@pytest.fixture(scope="session")
def provider_id():
    return env_or_skip("OPENRX_TEST_PROVIDER_ID", "test provider id")


@pytest.fixture(scope="session")
def admin_user_id():
    return env_or_skip("OPENRX_TEST_ADMIN_USER_ID", "test administrator id")




@pytest.fixture(scope="session")
def discovered():
    """Sanitized discovery output (ids, capabilities, endpoint baseline).

    Empty when discovery has never run. Tests that behave differently depending
    on which patient sub-resources exist can consult
    ``discovered["capabilities"]`` and ``discovered["baseline"]`` instead of
    guessing.
    """
    return DISCOVERED_FIXTURES


def pytest_collection_modifyitems(config, items):
    """
    Safety policy:

    Production write/destructive tests remain skipped unless explicitly
    requested with the appropriate pytest markers.
    """

    run_writes = os.getenv("OPENRX_RUN_WRITES", "").lower() == "true"

    for item in items:
        if "production_write" in item.keywords or "destructive" in item.keywords:
            if not run_writes:
                item.add_marker(
                    pytest.mark.skip(
                        reason="Production write/destructive tests disabled"
                    )
                )

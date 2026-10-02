"""Read-only production discovery for the OpenRx API test suite.

This module is the production half of the test strategy:

    production  ──authenticated GET──▶  discovery  ──sanitized fixtures──▶  tests

It drives a running backend with **authenticated GET requests only**, finds
real identifiers the data-dependent tests need (a patient, an encounter, a lab
report, a provider, an appointment, an administrator), records the *structure*
of the responses it saw, and writes both to ``fixtures/production_discovery.json``.

Design rules, enforced by the code rather than by convention:

* only ``GET``/``HEAD`` is ever sent — ``_get()`` raises otherwise, so discovery
  can never mutate production no matter how it is called;
* nothing but integers, booleans, counts, HTTP statuses and field-name/type
  structures are persisted — ``response_shape()`` collapses every response so a
  patient name, date of birth or message body cannot leak into a fixture;
* a missing resource (no documents, no lab reports) is recorded as absent rather
  than fabricated.

The companion modules are ``run_discovery.py`` (command line) and
``test_production_discovery.py`` (pytest).
"""

from __future__ import annotations

import dataclasses
import datetime as _dt
import json
import pathlib
import re
from typing import Any, Mapping

import requests

HERE = pathlib.Path(__file__).resolve().parent
API_TESTS_ROOT = HERE.parent
FIXTURES_DIR = API_TESTS_ROOT / "fixtures"
DEFAULT_OUTPUT = FIXTURES_DIR / "production_discovery.json"
DEFAULT_ENV_OUTPUT = FIXTURES_DIR / "production_discovery.env"

#: The only HTTP verbs discovery is allowed to issue.
READ_ONLY_METHODS = frozenset({"GET", "HEAD"})

#: discovery fixture key -> ``OPENRX_TEST_*`` environment variable used by conftest.
FIXTURE_ENV: dict[str, str] = {
    "patient_id": "OPENRX_TEST_PATIENT_ID",
    # ``patient_data.id`` and ``patient_data.pid`` are different columns and
    # diverge in practice. Patient-scoped routes use ``pid``; ``GET /patients/:id``
    # resolves by primary key first, so it needs the row id.
    "patient_record_id": "OPENRX_TEST_PATIENT_RECORD_ID",
    "encounter_id": "OPENRX_TEST_ENCOUNTER_ID",
    "appointment_id": "OPENRX_TEST_APPOINTMENT_ID",
    "document_id": "OPENRX_TEST_DOCUMENT_ID",
    "lab_report_id": "OPENRX_TEST_LAB_REPORT_ID",
    "provider_id": "OPENRX_TEST_PROVIDER_ID",
    "admin_user_id": "OPENRX_TEST_ADMIN_USER_ID",
}

#: Whole endpoints walked on every run. ``{placeholders}`` are filled from the
#: identifiers discovered earlier in the same run; a path whose placeholder is
#: unknown is skipped and noted. Everything here is a GET.
BASELINE_ENDPOINTS: tuple[str, ...] = (
    "/config",
    "/license/status",
    "/patients?limit=1",
    "/appointments",
    "/providers",
    "/providers/available-today",
    "/admin/users",
    "/documents",
    "/lab/catalog",
    "/labs/results",
    "/prescriptions",
    "/drugs",
    "/messages",
    "/notifications/summary",
    "/chat/patients",
    "/chat/users",
    "/referrals",
    "/reports/patients",
    "/reports/appointments",
    "/reports/encounters",
    "/reports/financial",
    "/billing/patients",
    "/billing/stats",
    "/billing/accounts-receivable",
    "/inventory/dashboard",
    "/inpatient/overview",
    "/emergency/board",
    "/nurse/dashboard",
    "/fhir/Patient",
    "/patients/{pid}",
    "/patients/{pid}/encounters",
    "/patients/{pid}/encounters/{eid}",
    "/patients/{pid}/encounters/{eid}/vitals",
    "/patients/{pid}/encounters/{eid}/soap",
    "/patients/{pid}/encounters/{eid}/notes",
    "/patients/{pid}/medications",
    "/patients/{pid}/allergies",
    "/patients/{pid}/allergies/enriched",
    "/patients/{pid}/conditions",
    "/patients/{pid}/immunizations",
    "/patients/{pid}/vitals",
    "/patients/{pid}/observations",
    "/patients/{pid}/notes",
    "/patients/{pid}/insurance",
    "/patients/{pid}/appointments",
    "/patients/{pid}/lab-reports",
    "/patients/{pid}/lab/ordered-tests",
    "/patients/{pid}/procedures",
    "/patients/{pid}/care-plan",
    "/patients/{pid}/ros",
    "/patients/{pid}/billing",
    "/patients/{pid}/encounter-breakdown",
    "/patients/{pid}/ccda",
    "/patients/{pid}/room",
    "/patients/{pid}/attending-history",
    "/lab/patients/{pid}/results",
    "/midwife/patients/{pid}/assessments",
    "/midwife/patients/{pid}/eligibility",
    "/referrals/smart-suggest/{pid}",
    "/chat/thread/{pid}",
    "/chat/access/{pid}",
    "/imaging/patient/{pid}",
    "/provider/profile/{provider_id}",
    "/appointments/{appointment_id}",
    "/lab/reports/{lab_report_id}",
    "/documents/{document_id}",
    "/admin/users/{admin_user_id}",
)

#: Fields that may hold a numeric identifier, tried in order. ``pid`` is last
#: because it holds a *patient* id: a lab-report or encounter row also carries
#: ``pid``, and picking it first silently made every scoped id resolve to the
#: patient instead of the resource.
_ID_FIELDS: tuple[str, ...] = (
    "id",
    "pc_eid",
    "encounter",
    "eid",
    "procedure_report_id",
    "report_id",
    "pid",
)

#: Patient sub-resources scored when picking the richest demonstration patient.
_PATIENT_RESOURCES: tuple[str, ...] = (
    "encounters",
    "medications",
    "lab-reports",
    "vitals",
    "notes",
    "allergies",
    "conditions",
    "immunizations",
)

_MAX_KEYS = 80
_MAX_DEPTH = 4

#: ``{placeholder}`` tokens inside a baseline endpoint template.
_PLACEHOLDER_RE = re.compile(r"\{([a-z_]+)\}")


def response_shape(payload: Any, depth: int = 0) -> Any:
    """Reduce ``payload`` to field names and primitive type names.

    No scalar value is ever returned: a dict becomes ``{key: shape}``, a list
    becomes ``{"kind": "list", "length": n, "item": shape}`` and a scalar
    becomes its type name. This is what makes a fixture safe to commit even
    though it describes production responses.
    """
    if depth >= _MAX_DEPTH:
        return type(payload).__name__

    if isinstance(payload, Mapping):
        return {
            str(key): response_shape(value, depth + 1)
            for key, value in list(payload.items())[:_MAX_KEYS]
        }

    if isinstance(payload, (list, tuple)):
        return {
            "kind": "list",
            "length": len(payload),
            "item": response_shape(payload[0], depth + 1) if payload else None,
        }

    return type(payload).__name__


def _as_int(value: Any) -> int | None:
    """Best-effort integer coercion; ``"34"`` and ``34.0`` both yield ``34``."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else None
    if isinstance(value, str) and value.strip():
        try:
            return int(value.strip())
        except ValueError:
            try:
                number = float(value)
            except ValueError:
                return None
            return int(number) if number.is_integer() else None
    return None


def _rows(payload: Any) -> list[Mapping[str, Any]]:
    """Return ``payload`` as row mappings, unwrapping a ``{items: []}`` envelope."""
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, Mapping)]
    if isinstance(payload, Mapping):
        for key in ("items", "data", "results", "entry", "rows"):
            value = payload.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, Mapping)]
    return []


def _first_id(
    rows: list[Mapping[str, Any]], fields: tuple[str, ...] = _ID_FIELDS
) -> int | None:
    """First positive integer found under any of ``fields`` in ``rows``."""
    for row in rows:
        for field in fields:
            value = _as_int(row.get(field))
            if value is not None and value > 0:
                return value
    return None


@dataclasses.dataclass
class Observation:
    """What one endpoint answered during discovery (never its raw content)."""

    path: str
    status: int | None
    kind: str
    count: int | None
    structure: Any = None
    error: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass
class DiscoveryResult:
    """The sanitized outcome of one discovery run."""

    api_url: str
    generated_at: str
    source: str
    fixtures: dict[str, int | None]
    capabilities: dict[str, bool]
    baseline: dict[str, Observation]
    database: dict[str, Any] = dataclasses.field(default_factory=dict)
    notes: list[str] = dataclasses.field(default_factory=list)

    def env(self) -> dict[str, str]:
        """The ``OPENRX_TEST_*`` variables the discovered fixtures provide."""
        return {
            env_key: str(self.fixtures[key])
            for key, env_key in FIXTURE_ENV.items()
            if self.fixtures.get(key)
        }

    def as_dict(self) -> dict[str, Any]:
        return {
            "api_url": self.api_url,
            "generated_at": self.generated_at,
            "source": self.source,
            "fixtures": self.fixtures,
            "capabilities": self.capabilities,
            "env": self.env(),
            "baseline": {path: obs.as_dict() for path, obs in self.baseline.items()},
            "database": self.database,
            "notes": self.notes,
        }


class ProductionDiscovery:
    """Walk a running OpenRx backend and discover sanitized test fixtures.

    The instance is single-use: construct it with an authenticated ``requests``
    session and call :meth:`run`.
    """

    def __init__(
        self,
        session: requests.Session,
        base_url: str,
        *,
        timeout: float = 25.0,
        max_patients: int = 40,
        max_encounter_probes: int = 4,
    ) -> None:
        self.session = session
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_patients = max_patients
        self.max_encounter_probes = max_encounter_probes

    # ── HTTP (GET only) ──────────────────────────────────────────────

    def _get(self, path: str) -> tuple[int | None, Any, str | None]:
        """GET ``path`` and return ``(status, json_payload, error)``.

        The method is asserted before anything is sent so a future edit cannot
        quietly turn discovery into a write.
        """
        method = "GET"
        assert method in READ_ONLY_METHODS, f"discovery may only issue {READ_ONLY_METHODS}"

        url = f"{self.base_url}{path}"
        try:
            response = self.session.request(method, url, timeout=self.timeout)
        except requests.RequestException as exc:  # network/DNS/timeout
            return None, None, f"{type(exc).__name__}: {exc}"

        try:
            payload: Any = response.json()
        except ValueError:
            payload = response.text
        return response.status_code, payload, None

    def _observe(self, path: str) -> Observation:
        """GET ``path`` and capture its status, size and sanitized structure."""
        status, payload, error = self._get(path)
        if error is not None:
            return Observation(path, None, "error", None, None, error)

        if isinstance(payload, list):
            kind, count = "list", len(payload)
        elif isinstance(payload, Mapping):
            items = payload.get("items")
            kind, count = "dict", len(items) if isinstance(items, list) else None
        else:
            kind, count = type(payload).__name__, None

        return Observation(path, status, kind, count, response_shape(payload))

    # ── Discovery ────────────────────────────────────────────────────

    def _patient_resources(self, pid: int) -> dict[str, list[Mapping[str, Any]]]:
        """Read every scored sub-resource for one patient."""
        resources: dict[str, list[Mapping[str, Any]]] = {}
        for resource in _PATIENT_RESOURCES:
            _, payload, error = self._get(f"/patients/{pid}/{resource}")
            resources[resource] = [] if error else _rows(payload)
        return resources

    @staticmethod
    def _score(resources: Mapping[str, list[Mapping[str, Any]]]) -> int:
        """How useful a patient is for the suite (breadth + clinical depth)."""
        score = sum(1 for rows in resources.values() if rows)
        score += 4 if resources.get("encounters") else 0
        score += 3 if resources.get("lab-reports") else 0
        return score


    def _pick_encounter(self, pid: int, encounters: list[Mapping[str, Any]]) -> int | None:
        """Prefer an encounter that has vitals or a SOAP note; else the first."""
        fallback = _first_id(encounters, ("id", "encounter", "eid"))
        for row in encounters[: self.max_encounter_probes]:
            eid = _first_id([row], ("id", "encounter", "eid"))
            if eid is None:
                continue
            for suffix in ("vitals", "soap"):
                _, payload, error = self._get(f"/patients/{pid}/encounters/{eid}/{suffix}")
                if error is None and _rows(payload):
                    return eid
        return fallback

    # ── Database structure (the app's *live* database) ───────────────

    def _capture_database(self) -> dict[str, Any]:
        """Record the live DB's structure via the app's own read-only reads.

        ``GET /db-admin/tables`` reports every table and its row count, which is
        how discovery proves it is describing the database the *app* is connected
        to rather than some local copy. ``describe`` adds the column names. Both
        are guarded reads; a non-admin token simply yields an empty structure.
        Only names and counts are kept — no row data is read.
        """
        database: dict[str, Any] = {
            "engine": "mysql",
            "tables": {},
            "patient_data_columns": [],
        }

        _, tables_payload, error = self._get("/db-admin/tables")
        if error is None:
            for row in _rows(tables_payload):
                name = row.get("name")
                if isinstance(name, str) and name:
                    database["tables"][name] = _as_int(row.get("rows")) or 0

        _, describe_payload, error = self._get("/db-admin/describe/patient_data")
        if error is None:
            for row in _rows(describe_payload):
                column = row.get("COLUMN_NAME") or row.get("column_name")
                if isinstance(column, str) and column:
                    database["patient_data_columns"].append(column)

        return database

    def run(self) -> DiscoveryResult:
        """Discover identifiers, walk the baseline, and return sanitized results."""
        notes: list[str] = []

        _, patients_payload, error = self._get(f"/patients?limit={self.max_patients}")
        if error is not None:
            raise RuntimeError(f"could not list patients: {error}")

        candidates: list[tuple[int, dict[str, list[Mapping[str, Any]]]]] = []
        row_ids: dict[int, int] = {}
        for row in _rows(patients_payload):
            pid = _as_int(row.get("pid"))
            if pid is None or pid <= 0:
                continue
            row_id = _as_int(row.get("id"))
            if row_id is not None:
                row_ids[pid] = row_id
            candidates.append((pid, self._patient_resources(pid)))

        if not candidates:
            raise RuntimeError("no patients returned by /patients; cannot discover fixtures")

        chosen_pid, chosen_resources = max(
            candidates, key=lambda item: self._score(item[1])
        )
        chosen_record_id = row_ids.get(chosen_pid)

        encounter_id = self._pick_encounter(
            chosen_pid, chosen_resources.get("encounters", [])
        )

        # Lab reports are patient-scoped; fall back to any patient that has one.
        report_id_fields = ("id", "procedure_report_id", "report_id")
        lab_report_id = _first_id(
            chosen_resources.get("lab-reports", []), report_id_fields
        )
        if lab_report_id is None:
            for pid, resources in candidates:
                candidate = _first_id(
                    resources.get("lab-reports", []), report_id_fields
                )
                if candidate is not None:
                    lab_report_id = candidate
                    notes.append(
                        f"lab_report_id={candidate} belongs to patient {pid}, "
                        f"not the primary patient {chosen_pid}"
                    )
                    break

        # Appointments are global; prefer one for the chosen patient.
        _, appointments_payload, _ = self._get("/appointments")
        appointment_rows = _rows(appointments_payload)
        appointment_id = None
        for row in appointment_rows:
            if _as_int(row.get("pc_pid")) == chosen_pid:
                appointment_id = _as_int(row.get("pc_eid"))
                if appointment_id:
                    break
        if appointment_id is None:
            appointment_id = _first_id(appointment_rows, ("pc_eid", "id", "eid"))

        _, providers_payload, _ = self._get("/providers")
        provider_id = _first_id(_rows(providers_payload), ("id",))

        _, users_payload, _ = self._get("/admin/users")
        user_rows = _rows(users_payload)
        admin_user_id = None
        for row in user_rows:
            role = str(row.get("main_menu_role") or row.get("role") or "").lower()
            if role in {"admin", "administrator"}:
                admin_user_id = _as_int(row.get("id"))
                if admin_user_id:
                    break
        if admin_user_id is None:
            admin_user_id = _first_id(user_rows)

        _, documents_payload, _ = self._get("/documents")
        document_id = _first_id(_rows(documents_payload), ("id",))
        if document_id is None:
            notes.append("no documents exist; OPENRX_TEST_DOCUMENT_ID remains unset")

        fixtures: dict[str, int | None] = {
            "patient_id": chosen_pid,
            "patient_record_id": chosen_record_id,
            "encounter_id": encounter_id,
            "appointment_id": appointment_id,
            "document_id": document_id,
            "lab_report_id": lab_report_id,
            "provider_id": provider_id,
            "admin_user_id": admin_user_id,
        }

        capabilities = {
            resource: bool(chosen_resources.get(resource))
            for resource in _PATIENT_RESOURCES
        }

        values: dict[str, Any] = {
            "pid": chosen_pid,
            "eid": encounter_id,
            "provider_id": provider_id,
            "appointment_id": appointment_id,
            "lab_report_id": lab_report_id,
            "document_id": document_id,
            "admin_user_id": admin_user_id,
            "id": chosen_record_id if chosen_record_id is not None else chosen_pid,
        }

        baseline: dict[str, Observation] = {}
        for template in BASELINE_ENDPOINTS:
            if any(
                values.get(placeholder) is None
                for placeholder in _PLACEHOLDER_RE.findall(template)
            ):
                notes.append(f"skipped {template}: identifier not discovered")
                continue
            baseline[template] = self._observe(template.format(**values))

        # The app's own DB-admin reads tell us which database it is actually
        # connected to; the fingerprint goes into the fixtures and the notes so a
        # run against the wrong database is obvious.
        database = self._capture_database()
        fingerprint = {
            key: database["tables"][key]
            for key in ("patient_data", "form_encounter", "procedure_order", "users")
            if key in database["tables"]
        }
        if fingerprint:
            notes.append(
                "app database fingerprint: "
                + ", ".join(f"{key}={value}" for key, value in fingerprint.items())
            )
        else:
            notes.append(
                "database introspection unavailable (token lacks admin access); "
                "install an admin token to record the live DB structure"
            )

        return DiscoveryResult(
            api_url=self.base_url,
            generated_at=_dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
            source="authenticated GET",
            fixtures=fixtures,
            capabilities=capabilities,
            baseline=baseline,
            database=database,
            notes=notes,
        )


# ── Persistence ────────────────────────────────────────────────────────


def write_fixtures(
    result: DiscoveryResult,
    json_path: pathlib.Path = DEFAULT_OUTPUT,
    env_path: pathlib.Path = DEFAULT_ENV_OUTPUT,
) -> tuple[pathlib.Path, pathlib.Path]:
    """Write the sanitized JSON fixture file and its ``.env`` companion."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps(result.as_dict(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# Generated by discovery/run_discovery.py — sanitized, no PHI.",
        f"# Source: {result.api_url} at {result.generated_at}",
    ]
    lines.extend(f"{key}={value}" for key, value in sorted(result.env().items()))
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return json_path, env_path


def load_fixtures(json_path: pathlib.Path = DEFAULT_OUTPUT) -> dict[str, Any]:
    """Load a previously written fixture file; ``{}`` when it does not exist."""
    try:
        return json.loads(json_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def fixtures_env(json_path: pathlib.Path = DEFAULT_OUTPUT) -> dict[str, str]:
    """The ``OPENRX_TEST_*`` variables from a fixture file, ready for ``os.environ``."""
    data = load_fixtures(json_path)
    env = data.get("env")
    if isinstance(env, dict):
        return {str(key): str(value) for key, value in env.items()}
    return {}


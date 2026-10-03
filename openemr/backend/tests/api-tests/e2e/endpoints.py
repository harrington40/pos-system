"""Declarative catalog of every API endpoint the backend exposes.

The catalog is **derived from the app** through the auto-generated route
inventory (``<api-tests>/api_routes.py``, produced by ``generate_api_routes.py``),
so it cannot silently drift: regenerate that file and this sweep picks up new
routes automatically.

Each entry is annotated with the feature ``domain`` (taken from the controller's
source folder, e.g. ``src/imaging/imaging.controller.ts`` -> ``imaging``) and the
small amount of metadata the tests need to build a concrete request.
"""
from __future__ import annotations

import pathlib
import re
import sys
from dataclasses import dataclass

# Make the parent ``api-tests`` directory importable regardless of pytest's
# import mode, so ``api_routes`` resolves.
_PARENT = pathlib.Path(__file__).resolve().parents[1]
if str(_PARENT) not in sys.path:
    sys.path.insert(0, str(_PARENT))

from api_routes import API_ROUTES  # noqa: E402

#: Values substituted for ``:parameters`` when building a request URL.
#: Deliberately benign ids — the sweep never assumes the rows exist.
PATH_PARAMETERS: dict[str, str] = {
    "code": "1",
    "drugName": "aspirin",
    "eid": "1",
    "id": "1",
    "orderId": "1",
    "paymentId": "1",
    "pid": "1",
    "role": "admin",
    "rxcui": "1191",
    "table": "patient_data",
    "token": "00000000-0000-0000-0000-000000000000",
    "type": "procedure",
    "userId": "1",
}

#: Routes the sweep skips on purpose (kept empty today; a place to park known
#: gaps without deleting coverage elsewhere).
IGNORED: set[str] = set()

_PARAM_RE = re.compile(r":([A-Za-z_]\w*)")


@dataclass(frozen=True)
class Endpoint:
    """One concrete API route from the inventory."""

    id: str
    method: str
    path: str
    domain: str
    auth_required: bool
    controller: str

    @property
    def is_read(self) -> bool:
        return self.method == "GET"

    def url(self, base: str) -> str:
        """Expand ``:parameters`` against ``base`` (no trailing slash)."""
        concrete = _PARAM_RE.sub(
            lambda m: PATH_PARAMETERS.get(m.group(1), "1"), self.path
        )
        return f"{base}{concrete}"


def _domain(controller: str) -> str:
    """``src/<domain>/<x>.controller.ts`` -> ``<domain>``."""
    parts = controller.split("/")
    return parts[1] if len(parts) >= 2 and parts[0] == "src" else "root"


def build_catalog() -> list[Endpoint]:
    """Build the full, ordered endpoint catalog from the route inventory."""
    return [
        Endpoint(
            id=f"{route.method} {route.path}",
            method=route.method,
            path=route.path,
            domain=_domain(route.controller),
            auth_required=route.auth_required,
            controller=route.controller,
        )
        for route in API_ROUTES
        if f"{route.method} {route.path}" not in IGNORED
    ]


def domains(catalog: list[Endpoint]) -> list[str]:
    """Sorted, de-duplicated list of feature domains present in ``catalog``."""
    return sorted({e.domain for e in catalog})

"""RN workbench (``nursing.controller.ts`` + ``medication-administration.controller.ts``).

Safety & workflow endpoints: code/isolation flags, fall/Braden assessments,
intake/output, SBAR handover, escalation, the task board, workload and the PRN
follow-up list. All read-only checks here.
"""

import pytest

WORKBENCH_ENDPOINTS = [
    "/nurse/tasks",
    "/nurse/workload",
    "/medication-administration/follow-ups",
]

PATIENT_ENDPOINTS = [
    "/patients/{pid}/flags",
    "/patients/{pid}/safety",
    "/patients/{pid}/io",
    "/patients/{pid}/handover",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", WORKBENCH_ENDPOINTS)
def test_workbench_read_endpoints(api_session, base_url, auth_headers, endpoint):
    response = api_session.get(
        f"{base_url}{endpoint}",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", PATIENT_ENDPOINTS)
def test_patient_workbench_endpoints(
    api_session, base_url, auth_headers, patient_id, endpoint
):
    response = api_session.get(
        f"{base_url}{endpoint.format(pid=patient_id)}",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.production_write
def test_escalate_patient():
    pytest.fail("Disabled: escalating files a task against the production ward")


@pytest.mark.authenticated
@pytest.mark.production_write
def test_record_intake_output():
    pytest.fail("Disabled: recording I/O mutates the production chart")

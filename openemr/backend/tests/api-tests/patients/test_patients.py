"""Patient endpoints (``patients.controller.ts``).

The identifiers come from a read-only discovery run (see ``discovery/``); when
none has been recorded, ``OPENRX_TEST_PATIENT_ID`` is unset and the tests that
need a real patient skip instead of failing.
"""

import pytest


@pytest.mark.authenticated
@pytest.mark.readonly
def test_list_patients(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/patients",
        headers=auth_headers,
        params={"limit": 5},
        timeout=15,
    )
    assert response.status_code in (200, 403)
    if response.status_code == 200:
        assert isinstance(response.json(), list)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_get_patient(api_session, base_url, auth_headers, patient_record_id):
    """``GET /patients/:id`` resolves by ``patient_data.id`` (the row id).

    The row id is distinct from ``pid`` (which the patient-scoped routes use),
    hence the dedicated ``patient_record_id`` fixture.
    """
    response = api_session.get(
        f"{base_url}/patients/{patient_record_id}",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403, 404)
    if response.status_code == 200:
        assert str(response.json().get("id")) == str(patient_record_id)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_patient_profile(api_session, base_url, auth_headers, patient_id):
    """The FHIR patient resource is the canonical single-patient profile."""
    response = api_session.get(
        f"{base_url}/fhir/Patient/{patient_id}",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403, 404)
    if response.status_code == 200:
        assert response.json().get("resourceType") == "Patient"


@pytest.mark.authenticated
@pytest.mark.readonly
def test_patient_validation_preview(api_session, base_url, auth_headers, patient_id):
    response = api_session.get(
        f"{base_url}/lab/patients/{patient_id}/validation-preview",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 400, 403, 404)


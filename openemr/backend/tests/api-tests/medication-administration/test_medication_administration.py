"""Medication administration for hospitalized patients.

A patient is *hospitalized* when they hold a bed in ``patient_care_assignment``
(a room). Admitting via ``POST /patients/:pid/hospitalize`` builds the
medication-administration record from the active prescriptions and raises the
notifications the nurse must act on; ``POST /medication-administration/orders/:id/
administer`` records a bedside dose after the smart safety check.
"""

import pytest

READ_ENDPOINTS = [
    "/medication-administration/dashboard",
    "/medication-administration/alerts",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", READ_ENDPOINTS)
def test_medication_admin_read_endpoints(
    api_session, base_url, auth_headers, endpoint
):
    response = api_session.get(
        f"{base_url}{endpoint}",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_patient_medication_orders(api_session, base_url, auth_headers, patient_id):
    response = api_session.get(
        f"{base_url}/patients/{patient_id}/medication-orders",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.production_write
def test_hospitalize_patient():
    pytest.fail(
        "Disabled: admitting a patient changes the production ward state and "
        "raises medication notifications"
    )


@pytest.mark.authenticated
@pytest.mark.production_write
def test_record_administration():
    pytest.fail("Disabled: recording a dose mutates the production MAR")

import pytest


BILLING_READ_ENDPOINTS = [
    "billing/accounts-receivable",
    "billing/financial-report",
    "billing/holds",
    "billing/integrity/runs",
    "billing/integrity/scan",
    "billing/integrity/settings",
    "billing/patients",
    "billing/price-catalog",
    "billing/settings",
    "billing/stats",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", BILLING_READ_ENDPOINTS)
def test_billing_read_endpoint(endpoint, api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/{endpoint}",
        headers=auth_headers,
        timeout=25,
    )

    assert response.status_code < 500, (
        f"/{endpoint} returned {response.status_code}\n{response.text[:400]}"
    )
    assert response.status_code in (200, 400, 403), response.status_code


@pytest.mark.authenticated
@pytest.mark.readonly
def test_billing_patient_clearance(api_session, base_url, auth_headers, patient_id):
    response = api_session.get(
        f"{base_url}/billing/patients/{patient_id}/clearance",
        headers=auth_headers,
        timeout=25,
    )
    assert response.status_code in (200, 400, 403, 404)


@pytest.mark.authenticated
@pytest.mark.production_write
def test_billing_write_operations():
    pytest.fail("Disabled until dedicated billing test data is configured")


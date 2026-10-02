import pytest


#: Read-only pharmacy/data endpoints. RxNav and drug-info live under their own
#: prefixes (the FDA proxy and the notifications controller respectively).
PHARMACY_READ_ENDPOINTS = [
    "drugs",
    "notifications/drug-info",
    "prescriptions",
    "fda/rxnav/search",
    "fda/rxnav/approximate",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", PHARMACY_READ_ENDPOINTS)
def test_pharmacy_read_endpoint(endpoint, api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/{endpoint}",
        headers=auth_headers,
        timeout=30,
    )

    assert response.status_code < 500, (
        f"/{endpoint} returned {response.status_code}\n{response.text[:400]}"
    )
    assert response.status_code in (200, 400, 403), response.status_code


@pytest.mark.authenticated
@pytest.mark.production_write
def test_create_prescription():
    pytest.fail("Disabled until dedicated clinical test data is configured")


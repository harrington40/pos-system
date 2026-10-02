"""Lab catalog, results and reports (``labs``/``labreports`` controllers).

Reads that need a real id use the discovered fixtures; without them the
identifier fixtures skip, keeping the module green out of the box.
"""

import pytest


@pytest.mark.authenticated
@pytest.mark.readonly
def test_lab_catalog(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/lab/catalog",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_lab_results(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/labs/results",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 400, 403, 404)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_lab_reports(api_session, base_url, auth_headers, patient_id):
    response = api_session.get(
        f"{base_url}/patients/{patient_id}/lab-reports",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


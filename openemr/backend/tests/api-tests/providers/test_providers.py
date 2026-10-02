"""Provider directory and dashboards (``provider.controller.ts``)."""

import pytest


@pytest.mark.authenticated
@pytest.mark.readonly
def test_providers(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/providers",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403)
    if response.status_code == 200:
        assert isinstance(response.json(), list)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_provider_profile(api_session, base_url, auth_headers, provider_id):
    response = api_session.get(
        f"{base_url}/provider/profile/{provider_id}",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403, 404)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_available_today(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/providers/available-today",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_provider_dashboard(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/provider/dashboard",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)


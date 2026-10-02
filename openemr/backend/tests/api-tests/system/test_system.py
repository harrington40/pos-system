import pytest


@pytest.mark.smoke
@pytest.mark.readonly
def test_api_config(api_session, base_url):
    response = api_session.get(f"{base_url}/config", timeout=15)
    assert response.status_code == 200


@pytest.mark.readonly
def test_status(api_session, base_url):
    response = api_session.get(f"{base_url}/license/status", timeout=15)
    assert response.status_code in (200, 401, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_facilities(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/facilities",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_devices(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/fda/devices",
        headers=auth_headers,
        timeout=30,
    )
    assert response.status_code in (200, 400, 403, 502, 503)


"""Administration console reads (``admin.controller.ts``).

The reads need an administrator token; a physician token gets ``403``, which is
an accepted answer. Without a token the ``auth_headers`` fixture skips.
"""

import pytest


@pytest.mark.authenticated
@pytest.mark.readonly
def test_admin_users(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/admin/users",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403)
    if response.status_code == 200:
        assert isinstance(response.json(), list)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_admin_user_detail(api_session, base_url, auth_headers, admin_user_id):
    response = api_session.get(
        f"{base_url}/admin/users/{admin_user_id}",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403, 404)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_admin_codes(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/admin/codes",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403, 404)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_admin_lists(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/admin/lists",
        headers=auth_headers,
        timeout=20,
    )
    assert response.status_code in (200, 403, 404)


@pytest.mark.authenticated
@pytest.mark.production_write
def test_admin_write_operations():
    pytest.fail("Disabled until dedicated administrator test account is configured")


import pytest


MESSAGING_READ_ENDPOINTS = [
    "messages",
    "chat/patients",
    "chat/users",
    "chat/unread",
    "notifications/summary",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", MESSAGING_READ_ENDPOINTS)
def test_messaging_read_endpoint(endpoint, api_session, base_url, auth_headers):
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
@pytest.mark.production_write
def test_send_message():
    pytest.fail("Disabled until dedicated test recipient/data is configured")


@pytest.mark.authenticated
@pytest.mark.destructive
def test_delete_message():
    pytest.fail("Disabled: deleting production messages")


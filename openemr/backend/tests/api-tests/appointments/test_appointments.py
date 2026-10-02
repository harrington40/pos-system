"""Appointments (``appointments.controller.ts``).

``test_open_slots`` and ``test_walk_ins`` use a discovered provider id and
today's date, which is what both endpoints expect as query parameters.
"""

import datetime

import pytest


def _today() -> str:
    return datetime.date.today().isoformat()


@pytest.mark.authenticated
@pytest.mark.readonly
def test_appointments(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/appointments",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_appointment_detail(api_session, base_url, auth_headers, appointment_id):
    response = api_session.get(
        f"{base_url}/appointments/{appointment_id}",
        headers=auth_headers,
        timeout=15,
    )
    assert response.status_code in (200, 403, 404)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_open_slots(api_session, base_url, auth_headers, provider_id):
    response = api_session.get(
        f"{base_url}/appointments/open-slots",
        headers=auth_headers,
        params={"date": _today(), "provider": provider_id},
        timeout=20,
    )
    assert response.status_code in (200, 400, 403)


@pytest.mark.authenticated
@pytest.mark.readonly
def test_walk_ins(api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}/appointments/walk-ins",
        headers=auth_headers,
        params={"date": _today()},
        timeout=20,
    )
    assert response.status_code in (200, 403)


@pytest.mark.authenticated
@pytest.mark.production_write
def test_create_appointment():
    pytest.fail(
        "Disabled: creating appointments against production requires an explicit test-data strategy"
    )


@pytest.mark.authenticated
@pytest.mark.production_write
def test_update_appointment_status():
    pytest.fail(
        "Disabled: changing appointment state in production requires an explicit test-data strategy"
    )


@pytest.mark.authenticated
@pytest.mark.destructive
def test_delete_appointment():
    pytest.fail(
        "Disabled: deleting production appointments is not allowed by default"
    )


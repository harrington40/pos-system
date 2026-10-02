import pytest


INVENTORY_READ_ENDPOINTS = [
    "inventory",
    "inventory/accounting/summary",
    "inventory/categories",
    "inventory/dashboard",
    "inventory/departments",
    "inventory/expiring",
    "inventory/forecast",
    "inventory/low-stock",
    "inventory/purchase-orders",
    "inventory/reorder-suggestions",
    "inventory/requests",
    "inventory/vendors",
]


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", INVENTORY_READ_ENDPOINTS)
def test_inventory_read_endpoint(endpoint, api_session, base_url, auth_headers):
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
def test_inventory_write_operations():
    pytest.fail("Disabled until dedicated inventory test data is configured")


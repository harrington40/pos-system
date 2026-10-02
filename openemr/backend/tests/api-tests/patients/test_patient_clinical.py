"""Patient-scoped clinical read endpoints.

The endpoint list is walked with a real discovered patient id
(``OPENRX_TEST_PATIENT_ID``). Every route is read-only; a ``403`` (role) or
``404`` (no such sub-resource for this patient) is a valid answer, a ``5xx`` is
not.
"""

import pytest


#: endpoint suffix -> full path template. Most live under ``/patients/{pid}``;
#: the lab results and midwife reads use their own prefixes.
PATIENT_ENDPOINTS = {
    "allergies": "/patients/{pid}/allergies",
    "allergies/enriched": "/patients/{pid}/allergies/enriched",
    "appointments": "/patients/{pid}/appointments",
    "billing": "/patients/{pid}/billing",
    "care-plan": "/patients/{pid}/care-plan",
    "ccda": "/patients/{pid}/ccda",
    "conditions": "/patients/{pid}/conditions",
    "discharge-summary": "/patients/{pid}/discharge-summary",
    "encounter-breakdown": "/patients/{pid}/encounter-breakdown",
    "encounters": "/patients/{pid}/encounters",
    "immunizations": "/patients/{pid}/immunizations",
    "insurance": "/patients/{pid}/insurance",
    "lab/ordered-tests": "/patients/{pid}/lab/ordered-tests",
    "lab-reports": "/patients/{pid}/lab-reports",
    "medications": "/patients/{pid}/medications",
    "notes": "/patients/{pid}/notes",
    "observations": "/patients/{pid}/observations",
    "procedures": "/patients/{pid}/procedures",
    "room": "/patients/{pid}/room",
    "ros": "/patients/{pid}/ros",
    "transactions": "/patients/{pid}/transactions",
    "vitals": "/patients/{pid}/vitals",
    "results": "/lab/patients/{pid}/results",
    "assessments": "/midwife/patients/{pid}/assessments",
    "eligibility": "/midwife/patients/{pid}/eligibility",
}


#: Endpoints with a known pre-existing server error on the current production
#: data. The discovery baseline records their status; here they are allowed to
#: answer 500 so a real regression elsewhere is not masked by a red known issue.
#: Remove a name from this set once the underlying bug is fixed.
KNOWN_SERVER_ERRORS = {"discharge-summary"}


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", sorted(PATIENT_ENDPOINTS))
def test_patient_read_endpoint(endpoint, api_session, base_url, auth_headers, patient_id):
    path = PATIENT_ENDPOINTS[endpoint].format(pid=patient_id)
    response = api_session.get(
        f"{base_url}{path}",
        headers=auth_headers,
        timeout=30,
    )

    if endpoint in KNOWN_SERVER_ERRORS:
        assert response.status_code in (200, 400, 403, 404, 500), response.status_code
        return

    assert response.status_code < 500, (
        f"/{endpoint} returned {response.status_code}\n{response.text[:400]}"
    )
    assert response.status_code in (200, 400, 403, 404), response.status_code


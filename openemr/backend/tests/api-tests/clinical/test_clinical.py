"""Clinical read endpoints (``clinical`` and ``fhir`` controllers).

The FHIR-named resources are served from the ``/fhir`` facade; ``procedures``
and ``orders`` come from the clinical/lab controllers. Every call is a GET.
"""

import pytest


#: clinical endpoint name -> full read path.
CLINICAL_READ_ENDPOINTS = {
    "AllergyIntolerance": "/fhir/AllergyIntolerance",
    "Condition": "/fhir/Condition",
    "Encounter": "/fhir/Encounter",
    "Immunization": "/fhir/Immunization",
    "MedicationRequest": "/fhir/MedicationRequest",
    "Observation": "/fhir/Observation",
    "Patient": "/fhir/Patient",
    "procedures": "/procedures",
    "orders": "/lab/orders",
}


@pytest.mark.authenticated
@pytest.mark.readonly
@pytest.mark.parametrize("endpoint", sorted(CLINICAL_READ_ENDPOINTS))
def test_clinical_endpoint(endpoint, api_session, base_url, auth_headers):
    response = api_session.get(
        f"{base_url}{CLINICAL_READ_ENDPOINTS[endpoint]}",
        headers=auth_headers,
        timeout=30,
    )

    assert response.status_code < 500, (
        f"/{endpoint} returned {response.status_code}\n{response.text[:400]}"
    )
    assert response.status_code in (200, 400, 403, 404), response.status_code


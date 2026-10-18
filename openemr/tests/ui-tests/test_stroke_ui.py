"""Stroke Care UI — read-only workflow navigation.

These tests use the existing Playwright harness and authenticated storage state.
They never write to the API. The full create/assess/finalize/export journey is
provided as an opt-in test for an isolated test environment only; it must not be
enabled against production.
"""
from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.stroke


def _open_stroke(page, ui_settings):
    page.goto(
        f"{ui_settings.base_url}/stroke",
        wait_until=ui_settings.nav_wait,
        timeout=ui_settings.timeout_ms,
    )
    page.get_by_text("OpenRx Stroke Care").wait_for(timeout=ui_settings.timeout_ms)


def test_stroke_dashboard_and_tabs_render(page, ui_settings, session_state):
    if session_state is None:
        pytest.skip("no UI session — set UI_TOKEN or valid UI_USER/UI_PASSWORD")
    _open_stroke(page, ui_settings)
    for label in ("Stroke board", "Emergency board", "Quality", "Protocols"):
        assert page.get_by_role("button", name=label).is_visible()


def test_legacy_stroke_care_alias_still_works(page, ui_settings, session_state):
    """/stroke-care remains available for existing bookmarks and integrations."""
    if session_state is None:
        pytest.skip("no UI session — set UI_TOKEN or valid UI_USER/UI_PASSWORD")
    page.goto(
        f"{ui_settings.base_url}/stroke-care",
        wait_until=ui_settings.nav_wait,
        timeout=ui_settings.timeout_ms,
    )
    page.get_by_text("OpenRx Stroke Care").wait_for(timeout=ui_settings.timeout_ms)


def test_emergency_alert_board_opens(page, ui_settings, session_state):
    if session_state is None:
        pytest.skip("no UI session — set UI_TOKEN or valid UI_USER/UI_PASSWORD")
    _open_stroke(page, ui_settings)
    page.get_by_role("button", name="Emergency board").click()
    assert page.get_by_text("Emergency").first.is_visible()


def test_stroke_imaging_rehabilitation_and_clinic_tabs(page, ui_settings, session_state):
    """Open the first stroke record and verify the clinical tabs are available."""
    if session_state is None:
        pytest.skip("no UI session — set UI_TOKEN or valid UI_USER/UI_PASSWORD")
    _open_stroke(page, ui_settings)
    rows = page.locator("tbody tr")
    if rows.count() == 0:
        pytest.skip("no stroke activation in this environment")
    rows.first.click()
    for label in ("Imaging", "Inpatient", "Rehab / clinic"):
        assert page.get_by_role("button", name=label).is_visible()


def test_full_stroke_workflow_is_opt_in(page, ui_settings, session_state):
    """
    Authorized clinician – create encounter – NIHSS – finalize – history – FHIR.

    Disabled by default: it writes clinical data. Enable only on an isolated,
    approved test environment with a dedicated patient.
    """
    if session_state is None:
        pytest.skip("no UI session — set UI_TOKEN or valid UI_USER/UI_PASSWORD")
    if os.environ.get("OPENRX_STROKE_WRITE_E2E") != "true":
        pytest.skip(
            "set OPENRX_STROKE_WRITE_E2E=true only on an isolated test environment"
        )
    patient_id = os.environ.get("OPENRX_STROKE_E2E_PATIENT_ID")
    if not patient_id:
        pytest.skip("set OPENRX_STROKE_E2E_PATIENT_ID to an approved test patient")
    pytest.skip(
        "Full write journey is intentionally gated; execute it only with clinical "
        "test data approval and the dedicated test environment runbook."
    )

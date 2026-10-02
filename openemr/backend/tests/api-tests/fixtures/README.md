# Discovered fixtures

`production_discovery.json` is written by
`discovery/run_discovery.py` (or `discovery/test_production_discovery.py` when
`OPENRX_RUN_DISCOVERY=true`). It is a **sanitized** snapshot of the identifiers
the test suite needs so its previously-skipped, data-dependent tests can run
against a known production structure.

It contains:

* `fixtures` — integer identifiers only (`patient_id`, `patient_record_id`,
  `encounter_id`, `appointment_id`, `document_id`, `lab_report_id`,
  `provider_id`, `admin_user_id`);
* `capabilities` — which patient sub-resources actually returned data;
* `baseline` — for each endpoint walked: HTTP status, payload kind, row count
  and the **field-name/type structure** of the response;
* `database` — the *app's* live database fingerprint, read from the app's own
  `/db-admin/tables` and `/db-admin/describe/patient_data` (table names + row
  counts + `patient_data` column names). This is how the baseline proves which
  database the app is actually connected to, rather than trusting a local copy;
* `env` — the `OPENRX_TEST_*` environment variables that `conftest.py` seeds.

It deliberately contains **no** names, dates of birth, phone numbers, addresses,
emails, message bodies or any other patient information. `discovery.py` reduces
every response to its shape before it is written, so a raw payload can never be
persisted by accident.

The file is safe to commit; regenerate it whenever production data changes:

```bash
python discovery/run_discovery.py --token "$OPENRX_API_TOKEN"
```

`production_discovery.env` is a convenience copy of `env` for shells and CI; it
is regenerated alongside the JSON and is not needed when the JSON is present.

"""Read-only production discovery for the OpenRx API test suite.

The modules in this package walk a running OpenRx backend with authenticated
``GET`` requests only, discover real identifiers (a patient, an encounter, a lab
report, a provider, an appointment, an administrator) and persist *sanitized*
fixtures that the per-domain tests consume.

Nothing here writes to the API. See ``discovery.py`` for the rules the code
enforces and ``README.md`` in this folder for how to run it.
"""

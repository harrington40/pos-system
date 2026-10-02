#!/usr/bin/env python3
"""Run read-only production discovery and write sanitized test fixtures.

Typical use::

    # With a service token (the only request discovery itself ever sends is GET)
    OPENRX_API_URL=https://openrx.example.com/api \
    OPENRX_API_TOKEN="$TOKEN" \
    python discovery/run_discovery.py

    # Against the local test backend, logging in first
    python discovery/run_discovery.py \
        --api-url http://localhost:3202/api --login admin:OpenRxTest123

``--login`` is the one non-GET request this script can send, and it is opt-in:
discovery itself only ever issues GETs. Prefer the token form in CI.

Exit codes: ``0`` discovery succeeded and fixtures were written, ``1`` it did
not (no credentials, unreachable API, no patients).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
if str(HERE.parent) not in sys.path:  # allow `python discovery/run_discovery.py`
    sys.path.insert(0, str(HERE.parent))

from discovery.discovery import (  # noqa: E402
    DEFAULT_ENV_OUTPUT,
    DEFAULT_OUTPUT,
    ProductionDiscovery,
    write_fixtures,
)

DEFAULT_API_URL = "http://localhost:3202/api"


def _session_from_token(base_url: str, token: str) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )
    return session


def _session_from_login(base_url: str, username: str, password: str) -> requests.Session:
    """Log in and return an authenticated session.

    This is the only non-GET request the tool can make. It is reached only when
    ``--login`` is passed explicitly, never as a fallback, so a normal run stays
    strictly read-only.
    """
    session = requests.Session()
    session.headers.update(
        {"Accept": "application/json", "Content-Type": "application/json"}
    )

    response = session.post(
        f"{base_url}/auth/login",
        json={"username": username, "password": password},
        timeout=20,
    )
    if response.status_code not in (200, 201):
        raise SystemExit(
            f"login failed for {username!r}: HTTP {response.status_code} "
            f"{response.text[:200]}"
        )

    token = response.json().get("token")
    if not token:
        raise SystemExit("login response did not contain a token")

    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--api-url",
        default=os.getenv("OPENRX_API_URL", DEFAULT_API_URL),
        help="API base URL including /api (default: %(default)s)",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("OPENRX_API_TOKEN"),
        help="Bearer token; defaults to OPENRX_API_TOKEN",
    )
    parser.add_argument(
        "--login",
        metavar="USER:PASSWORD",
        help="Log in first (opt-in, sends one POST). Prefer --token in CI.",
    )
    parser.add_argument("--timeout", type=float, default=25.0, help="per-request timeout")
    parser.add_argument(
        "--max-patients", type=int, default=40, help="patients scored when picking a demo patient"
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--env-output", type=Path, default=DEFAULT_ENV_OUTPUT)
    parser.add_argument("--quiet", action="store_true", help="only print the fixture ids")
    return parser.parse_args(argv)


def _build_session(args: argparse.Namespace) -> requests.Session:
    base_url = args.api_url.rstrip("/")
    if args.login:
        if ":" not in args.login:
            raise SystemExit("--login expects USER:PASSWORD")
        username, password = args.login.split(":", 1)
        return _session_from_login(base_url, username, password)
    if args.token:
        return _session_from_token(base_url, args.token)
    raise SystemExit(
        "no credentials: pass --token (or OPENRX_API_TOKEN), or --login USER:PASSWORD"
    )


def _summarize(result, quiet: bool) -> None:
    if quiet:
        print(
            " ".join(
                f"{key}={value}"
                for key, value in sorted(result.fixtures.items())
                if value
            )
        )
        return

    print(f"OpenRx discovery against {result.api_url}")
    print(f"  source: {result.source}")
    for key, value in sorted(result.fixtures.items()):
        print(f"  {key:16s} {value if value is not None else '(not found)'}")

    ok = sum(
        1
        for obs in result.baseline.values()
        if obs.status is not None and obs.status < 500
    )
    print(f"  baseline endpoints: {ok}/{len(result.baseline)} answered without 5xx")

    for note in result.notes:
        print(f"  note: {note}")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    base_url = args.api_url.rstrip("/")

    session = _build_session(args)
    try:
        result = ProductionDiscovery(
            session,
            base_url,
            timeout=args.timeout,
            max_patients=args.max_patients,
        ).run()
    except RuntimeError as exc:
        print(f"discovery failed: {exc}", file=sys.stderr)
        return 1

    json_path, env_path = write_fixtures(result, args.output, args.env_output)
    _summarize(result, args.quiet)
    print(f"wrote {json_path}")
    print(f"wrote {env_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Sequence
from typing import Any
from urllib.error import HTTPError
from urllib.request import urlopen


class SmokeCheckError(RuntimeError):
    pass


def fetch_text(url: str, timeout_seconds: float) -> str:
    try:
        response = urlopen(url, timeout=timeout_seconds)
    except HTTPError as error:
        error.close()
        raise

    with response:
        return response.read().decode("utf-8")


def fetch_json(url: str, timeout_seconds: float) -> Any:
    return json.loads(fetch_text(url, timeout_seconds))


def verify_contract(
    base_url: str, expected_version: str | None, timeout_seconds: float
) -> str:
    health = fetch_text(f"{base_url}/health", timeout_seconds).strip()
    if health != "healthy":
        raise SmokeCheckError(f"health returned {health!r}")

    version = fetch_json(f"{base_url}/version", timeout_seconds)
    actual_version = version.get("version") if isinstance(version, dict) else None
    if not isinstance(actual_version, str) or not actual_version.strip():
        raise SmokeCheckError("/version did not return a valid version")
    if expected_version is not None and actual_version != expected_version:
        raise SmokeCheckError(
            f"expected {expected_version}, received {actual_version} from /version"
        )

    html = fetch_text(f"{base_url}/", timeout_seconds)
    if "Golden Hour" not in html:
        raise SmokeCheckError("the home page does not identify Golden Hour")

    places = fetch_json(f"{base_url}/api/places", timeout_seconds)
    listed = places.get("places") if isinstance(places, dict) else None
    if not isinstance(listed, list) or not any(
        isinstance(place, dict) and place.get("slug") == "lofoten" for place in listed
    ):
        raise SmokeCheckError("/api/places does not include lofoten")

    return actual_version


def check_deployment(
    base_url: str,
    expected_version: str | None = None,
    *,
    attempts: int = 10,
    delay_seconds: float = 3,
    timeout_seconds: float = 10,
) -> str:
    if attempts < 1:
        raise ValueError("attempts must be at least 1")

    base_url = base_url.rstrip("/")
    for attempt in range(1, attempts + 1):
        try:
            return verify_contract(base_url, expected_version, timeout_seconds)
        except (OSError, SmokeCheckError, ValueError) as error:
            if attempt == attempts:
                raise SmokeCheckError(
                    f"deployment smoke failed after {attempts} attempts: {error}"
                ) from error
            time.sleep(delay_seconds)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="verify a deployed Golden Hour revision"
    )
    parser.add_argument("base_url")
    parser.add_argument("expected_version", nargs="?")
    parser.add_argument("--attempts", type=int, default=10)
    parser.add_argument("--delay-seconds", type=float, default=3)
    parser.add_argument("--timeout-seconds", type=float, default=10)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    actual_version = check_deployment(
        args.base_url,
        args.expected_version,
        attempts=args.attempts,
        delay_seconds=args.delay_seconds,
        timeout_seconds=args.timeout_seconds,
    )
    print(f"deployment smoke passed for {actual_version}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SmokeCheckError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error

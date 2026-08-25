#!/usr/bin/env bash
set -euo pipefail

project=aca-prod-smoke
port=${GOLDEN_HOUR_SMOKE_PORT:-18123}
compose=(docker compose --project-name "$project")

cleanup() {
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

export GOLDEN_HOUR_PORT=$port
export SERVICE_VERSION=container-smoke

"${compose[@]}" up --build --detach --wait

health=$(curl --fail --silent --show-error "http://127.0.0.1:$port/health")
[[ $health == healthy ]]

version=$(curl --fail --silent --show-error "http://127.0.0.1:$port/version")
python3 -c '
import json
import sys

value = json.loads(sys.argv[1])
assert value == {"service": "golden-hour", "version": "container-smoke"}
' "$version"

html=$(curl --fail --silent --show-error "http://127.0.0.1:$port/")
grep -q 'Golden Hour' <<<"$html"

uid=$("${compose[@]}" exec -T app id -u | tr -d '\r')
[[ $uid == 10001 ]]

"${compose[@]}" exec -T app   test -r /usr/share/zoneinfo/Europe/Oslo
"${compose[@]}" exec -T app   sh -c 'touch /tmp/write-test && rm /tmp/write-test'

printf 'container smoke passed on port %s\n' "$port"

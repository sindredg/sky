import re
from pathlib import Path

ROOT = Path(__file__).parents[2]

# Copying the exact image into the test only duplicates it. Assert the shape:
# an exact patch version, a slim variant, and a digest so the tag cannot move.
BASE_IMAGE = re.compile(
    r"^FROM python:(?P<series>\d+\.\d+)\.\d+-slim-[a-z]+"
    r"@sha256:[0-9a-f]{64}\n"
)


def read(name: str) -> str:
    return (ROOT / name).read_text()


def test_dockerfile_pins_runtime_and_runs_non_root():
    dockerfile = read("Dockerfile")

    assert BASE_IMAGE.match(dockerfile)
    assert "apt-get install --yes --no-install-recommends tzdata" in dockerfile
    assert "USER 10001:10001" in dockerfile
    assert "EXPOSE 8080" in dockerfile
    assert "HEALTHCHECK" in dockerfile
    assert '"app.src.main:app"' in dockerfile
    assert '"--host", "0.0.0.0"' in dockerfile
    assert '"--port", "8080"' in dockerfile


def test_compose_limits_the_local_container():
    compose = read("compose.yaml")

    assert '"127.0.0.1:${GOLDEN_HOUR_PORT:-8123}:8080"' in compose
    assert "read_only: true" in compose
    assert "no-new-privileges:true" in compose
    assert "cap_drop:\n      - ALL" in compose
    assert "tmpfs:\n      - /tmp:rw,noexec,nosuid,size=16m" in compose


def test_build_context_excludes_local_and_runtime_state():
    ignored = set(read(".dockerignore").splitlines())

    assert {
        ".git",
        ".github",
        ".venv",
        ".superpowers",
        "AGENTS.md",
        "CONTEXT.md",
        "app/tests",
        "docs",
    } <= ignored


def test_smoke_script_cleans_up_and_checks_runtime_contract():
    script = read("scripts/container-smoke.sh")

    assert "trap cleanup EXIT" in script
    assert "/health" in script
    assert "/version" in script
    assert "id -u" in script
    assert "/usr/share/zoneinfo/Europe/Oslo" in script


def test_the_version_is_a_build_argument_rather_than_a_fixed_value():
    dockerfile = (ROOT / "Dockerfile").read_text()

    # A hardcoded version means a running replica cannot say which build it is.
    assert "ARG SERVICE_VERSION=0.0.0-local" in dockerfile
    assert "SERVICE_VERSION=${SERVICE_VERSION}" in dockerfile


def runtime_series() -> str:
    found = BASE_IMAGE.match(read("Dockerfile"))
    assert found, "the Dockerfile does not pin a digest"
    return found.group("series")


def test_the_dockerfile_pins_a_specific_patch_release():
    # A series tag such as python:3.12-slim would move underneath the digest.
    assert runtime_series().count(".") == 1


def test_ci_derives_the_runtime_from_the_dockerfile():
    workflow = read(".github/workflows/ci.yml")

    # Naming a version here lets a base image bump ship an untested runtime.
    assert "grep -oP '^FROM \\K\\S+' Dockerfile" in workflow
    assert "python-version:" not in workflow

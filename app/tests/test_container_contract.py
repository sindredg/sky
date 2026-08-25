from pathlib import Path

ROOT = Path(__file__).parents[2]
BASE_IMAGE = (
    "python:3.12.14-slim-bookworm@"
    "sha256:b64e9d3a71eddaa1b3f80c04abf292b3139e3b7c4dd272d19c31dc1f91194d1b"
)


def read(name: str) -> str:
    return (ROOT / name).read_text()


def test_dockerfile_pins_runtime_and_runs_non_root():
    dockerfile = read("Dockerfile")

    assert dockerfile.startswith(f"FROM {BASE_IMAGE}\n")
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
        "terraform",
        "**/.terraform",
        "*.tfstate*",
        "*.tfplan",
    } <= ignored


def test_smoke_script_cleans_up_and_checks_runtime_contract():
    script = read("scripts/container-smoke.sh")

    assert "trap cleanup EXIT" in script
    assert "/health" in script
    assert "/version" in script
    assert "id -u" in script
    assert "/usr/share/zoneinfo/Europe/Oslo" in script

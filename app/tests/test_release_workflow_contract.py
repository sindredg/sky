import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "release.yml"
PINNED = re.compile(r"^\s*(-\s+)?uses:\s+\S+@[0-9a-f]{40}\s")


def read() -> str:
    return WORKFLOW.read_text()


def jobs() -> dict[str, str]:
    lines = read().split("\n")
    body = lines[lines.index("jobs:") + 1 :]

    collected: dict[str, list[str]] = {}
    current = None
    for line in body:
        header = re.match(r"^  ([a-z][a-z0-9_-]*):$", line)
        if header:
            current = header.group(1)
            collected[current] = []
        elif current is not None:
            collected[current].append(line)

    return {name: "\n".join(text) for name, text in collected.items()}


def test_the_release_builds_before_it_deploys():
    defined = jobs()

    assert "build" in defined
    assert "deploy" in defined
    assert "needs: build" in defined["deploy"]


def test_only_the_deploy_job_targets_the_production_environment():
    defined = jobs()

    def declares_environment(text: str) -> bool:
        lines = text.split(chr(10))
        return any(line.strip().startswith("environment:") for line in lines)

    assert declares_environment(defined["deploy"])
    assert "environment: production" in defined["deploy"]
    assert not declares_environment(defined["build"])


def test_the_digest_travels_as_a_job_output_into_terraform():
    defined = jobs()

    assert "digest" in defined["build"]
    assert "needs.build.outputs.digest" in defined["deploy"]
    assert "-var=image_digest=" in defined["deploy"]


def test_the_workflow_cannot_write_to_a_pull_request():
    text = read()

    assert "pull-requests: write" not in text
    assert "issues: write" not in text


def test_the_subscription_id_comes_from_a_secret():
    text = read()

    assert "secrets.AZURE_SUBSCRIPTION_ID" in text
    assert "vars.AZURE_SUBSCRIPTION_ID" not in text


def test_every_action_is_pinned_to_a_commit_sha():
    used = [line for line in read().split("\n") if "uses:" in line]

    assert used
    for line in used:
        assert PINNED.match(line + " "), line

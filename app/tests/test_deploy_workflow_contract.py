import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "deploy.yml"
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


def test_both_jobs_request_an_oidc_token():
    for name, text in jobs().items():
        assert "id-token: write" in text, name


def test_the_first_platform_deployment_can_be_started_manually():
    text = read()
    apply = jobs()["apply"]

    assert "workflow_dispatch:" in text
    assert "github.event_name == 'workflow_dispatch'" in apply


def test_only_the_apply_job_targets_the_production_environment():
    defined = jobs()

    assert "environment: production" in defined["apply"]
    assert "environment:" not in defined["plan"]


def test_the_workflow_cannot_write_to_a_pull_request():
    # Plan output carries the subscription ID, and masking does not reach the API.
    text = read()

    assert "pull-requests: write" not in text
    assert "issues: write" not in text


def test_each_job_authenticates_as_its_own_identity():
    defined = jobs()

    assert "vars.AZURE_PLAN_CLIENT_ID" in defined["plan"]
    assert "vars.AZURE_DEPLOY_CLIENT_ID" not in defined["plan"]
    assert "vars.AZURE_DEPLOY_CLIENT_ID" in defined["apply"]
    assert "vars.AZURE_PLAN_CLIENT_ID" not in defined["apply"]


def test_the_subscription_id_comes_from_a_secret():
    text = read()

    assert "secrets.AZURE_SUBSCRIPTION_ID" in text
    assert "vars.AZURE_SUBSCRIPTION_ID" not in text


def test_every_action_is_pinned_to_a_commit_sha():
    used = [line for line in read().split("\n") if "uses:" in line]

    assert used
    for line in used:
        assert PINNED.match(line + " "), line

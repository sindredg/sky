import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "monitor.yml"
PINNED = re.compile(r"^\s*(-\s+)?uses:\s+\S+@[0-9a-f]{40}\s")


def read() -> str:
    return WORKFLOW.read_text()


def test_the_monitor_runs_hourly_and_can_be_started_manually():
    text = read()

    assert "schedule:" in text
    assert "cron: '17 * * * *'" in text
    assert "workflow_dispatch:" in text


def test_the_monitor_has_bounded_overlapping_runs():
    text = read()

    assert "group: monitor-production" in text
    assert "cancel-in-progress: true" in text
    assert "timeout-minutes: 5" in text


def test_the_monitor_uses_the_public_url_without_cloud_credentials():
    text = read()

    assert "azurecontainerapps.io" in text
    assert "python3 scripts/deployment_smoke.py" in text
    assert '"$PRODUCTION_URL"' in text
    assert "GITHUB_SHA" not in text
    assert "AZURE_" not in text
    assert "secrets." not in text
    assert "id-token: write" not in text


def test_the_monitor_has_read_only_repository_permissions():
    text = read()

    assert "permissions:\n  contents: read" in text
    assert "contents: write" not in text
    assert "pull-requests: write" not in text
    assert "issues: write" not in text


def test_every_action_is_pinned_to_a_commit_sha():
    used = [line for line in read().split("\n") if "uses:" in line]

    assert used
    for line in used:
        assert PINNED.match(line + " "), line

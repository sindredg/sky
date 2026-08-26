import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"


def push_paths(name: str) -> list[str]:
    """The path filters under the push trigger, in order."""
    lines = (WORKFLOWS / name).read_text().split("\n")
    start = next(i for i, line in enumerate(lines) if line.startswith("  push:"))

    collected, seen_paths = [], False
    for line in lines[start + 1 :]:
        if line and not line.startswith("    "):
            break
        if line.strip() == "paths:":
            seen_paths = True
            continue
        found = re.match(r"^      - '(.+)'$", line)
        if seen_paths and found:
            collected.append(found.group(1))
        elif seen_paths and line.strip() and not line.strip().startswith("#"):
            break
    return collected


def triggers(patterns: list[str], path: str) -> bool:
    """GitHub applies the patterns in order, and the last match wins."""
    result = False
    for pattern in patterns:
        negated = pattern.startswith("!")
        glob = pattern.lstrip("!")
        regex = re.escape(glob).replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
        if re.fullmatch(regex, path):
            result = not negated
    return result


def test_the_two_workflows_never_claim_the_same_file():
    deploy = push_paths("deploy.yml")
    release = push_paths("release.yml")

    assert deploy and release

    for path in (
        "terraform/stacks/platform/main.tf",
        "terraform/stacks/application/main.tf",
        "terraform/bootstrap/identities.tf",
        "app/src/main.py",
        "app/tests/test_api.py",
        "Dockerfile",
    ):
        assert not (triggers(deploy, path) and triggers(release, path)), path


def test_each_workflow_watches_the_stack_it_applies():
    deploy = push_paths("deploy.yml")
    release = push_paths("release.yml")

    assert triggers(deploy, "terraform/stacks/platform/main.tf")
    assert not triggers(deploy, "terraform/stacks/application/main.tf")

    assert triggers(release, "terraform/stacks/application/main.tf")
    assert not triggers(release, "terraform/stacks/platform/main.tf")


def test_the_pipeline_never_applies_the_human_owned_bootstrap():
    for name in ("deploy.yml", "release.yml"):
        assert not triggers(push_paths(name), "terraform/bootstrap/identities.tf")


def test_a_test_only_change_does_not_deploy():
    release = push_paths("release.yml")

    # Tests are excluded from the image, so they cannot change what runs.
    assert triggers(release, "app/src/main.py")
    assert not triggers(release, "app/tests/test_api.py")

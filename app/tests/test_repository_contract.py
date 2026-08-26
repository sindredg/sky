from pathlib import Path

ROOT = Path(__file__).parents[2]


def ignore_rules() -> list[str]:
    text = (ROOT / ".gitignore").read_text()
    return [line.strip() for line in text.splitlines() if line.strip()]


def test_the_public_readme_is_not_ignored():
    # The README is the public face of the repository and must stay tracked.
    assert "README.md" not in ignore_rules()


def test_the_agent_notes_stay_ignored():
    rules = ignore_rules()

    for note in ("CLAUDE.md", "AGENTS.md", "CONTEXT.md", "docs/superpowers/"):
        assert note in rules


def test_dependabot_watches_the_pinned_dependencies():
    config = (ROOT / ".github" / "dependabot.yml").read_text()

    # SHA pins never float, so nothing surfaces an update without this.
    for ecosystem in ("github-actions", "pip", "docker"):
        assert f"package-ecosystem: {ecosystem}" in config


def test_no_workflow_still_targets_the_deprecated_node_20_actions():
    stale = (
        "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
        "azure/login@7184910d9eb2b1c5e48f7073824a90609bb9b6d6",
        "actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065",
    )

    for workflow in (ROOT / ".github" / "workflows").glob("*.yml"):
        text = workflow.read_text()
        for pin in stale:
            assert pin not in text, f"{workflow.name} still pins {pin}"

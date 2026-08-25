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

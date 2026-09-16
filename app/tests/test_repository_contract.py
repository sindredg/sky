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


def test_warnings_fail_the_build():
    config = (ROOT / "pytest.ini").read_text()

    # Without this the next deprecation is a log line rather than a red check.
    assert "filterwarnings" in config
    assert "error" in config


def test_the_test_client_uses_the_supported_http_library():
    requirements = (ROOT / "app" / "requirements-dev.txt").read_text()

    # Starlette 1.6 deprecated httpx for its test client in favour of httpx2.
    assert "httpx2==" in requirements
    assert "\nhttpx==" not in requirements


def test_the_readme_counts_the_places_correctly():
    from app.src.places import PLACES

    readme = (ROOT / "README.md").read_text()

    # The count has drifted twice without the README noticing: nine to
    # seventeen, then to thirty-seven while no CI was running this test.
    assert f"{len(PLACES)} places" in readme


def test_the_readme_links_the_running_service():
    readme = (ROOT / "README.md").read_text()

    # The cluster in k8-lab serves this application under the /sky prefix.
    assert "https://sindrg.com/sky" in readme
    assert "Nothing is deployed yet" not in readme


def test_public_accuracy_claims_name_their_sources_and_validation_scope():
    readme = (ROOT / "README.md").read_text()

    assert "https://aa.usno.navy.mil/faq/sun_approx" in readme
    assert "https://stjarnhimlen.se/comp/ppcomp.html" in readme
    assert "https://ssd.jpl.nasa.gov/horizons/" in readme
    assert "not a general accuracy guarantee" in readme


def test_the_readme_does_not_present_ci_as_independent_review():
    readme = (ROOT / "README.md").read_text()

    assert "not independent peer review" in readme

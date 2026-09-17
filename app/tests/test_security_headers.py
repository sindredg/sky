import re
from pathlib import Path

from fastapi.testclient import TestClient

from app.src import main as main_module

STATIC = Path(__file__).parents[1] / "static"

client = TestClient(main_module.app)


def policy() -> str:
    return client.get("/").headers["content-security-policy"]


def directive(name: str) -> str:
    for part in policy().split(";"):
        head, _, rest = part.strip().partition(" ")
        if head == name:
            return rest
    raise AssertionError(f"the policy has no {name} directive")


def resource_origins() -> set[str]:
    # Only loads, never <a href>: navigating to NASA is not a resource fetch.
    origins = set()
    markup = (STATIC / "index.html").read_text(encoding="utf-8")
    origins.update(re.findall(r'src="(https://[^"/]+)', markup))
    origins.update(re.findall(r'<link[^>]+href="(https://[^"/]+)', markup))

    for sheet in STATIC.glob("*.css"):
        text = sheet.read_text(encoding="utf-8")
        origins.update(re.findall(r"url\(['\"]?(https://[^)'\"/]+)", text))

    return origins


def test_an_injected_script_cannot_run():
    # Nothing here runs a string or needs an inline script, so the directive
    # that answers an injected <script> is the one worth pinning.
    assert "'unsafe-inline'" not in directive("script-src")
    assert "'unsafe-eval'" not in directive("script-src")


def test_the_page_cannot_be_framed():
    assert directive("frame-ancestors") == "'none'"


def test_every_origin_the_page_loads_is_allowed():
    # A stylesheet that starts pulling from a new origin fails in the browser
    # and nowhere else, so the files are checked against the policy.
    served = policy()
    missing = sorted(origin for origin in resource_origins() if origin not in served)

    assert missing == [], f"loaded but not allowed by the policy: {missing}"

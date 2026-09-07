import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text(encoding="utf-8")


def referenced_paths(markup: str) -> list[str]:
    return re.findall(r'(?:src|href)="(/[^"]*)"', markup)


def test_assets_are_requested_from_the_static_mount():
    # The HTTPRoute strips the /sky prefix before the request arrives, so the
    # page cannot tell it is mounted there. A root-absolute asset path leaves
    # the workload entirely and lands on the project page instead.
    stray = [
        path
        for path in referenced_paths(read("index.html"))
        if not path.startswith("/static/") and path != "/sky"
    ]

    assert stray == [], f"these leave the /static mount: {stray}"


def test_the_brand_link_stays_inside_the_prefix():
    # href="/" reaches the nginx project page rather than this application.
    markup = read("index.html")

    assert 'class="brand"' in markup, "the brand link is missing"
    assert re.search(r'<a href="/sky" class="brand"', markup)


def test_every_referenced_asset_is_shipped():
    missing = [
        path
        for path in referenced_paths(read("index.html"))
        if path.startswith("/static/")
        and not (STATIC / path.removeprefix("/static/")).exists()
    ]

    assert missing == [], f"referenced but not present: {missing}"


def test_module_imports_resolve_beside_the_entry_point():
    # A bare or root-absolute specifier does not resolve from /static/app.js.
    specifiers = re.findall(r'^import .*? from \'([^\']+)\'', read("app.js"), re.M)

    assert specifiers, "the entry point imports nothing, which is unexpected"
    assert all(spec.startswith("./") for spec in specifiers), specifiers

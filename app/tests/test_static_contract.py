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


def test_every_navigation_view_is_wired_to_a_title_and_a_drawing():
    # setView destructures the title entry, so a button added without one throws before
    # the view can render, and the renderer falls through to the wrong scene.
    views = set(re.findall(r'data-view="(\w+)"', read("index.html")))
    assert len(views) >= 3, views

    titles = re.search(r"const titles=\{(.*?)\};", read("app.js"))
    assert titles, "setView no longer builds a titles map"
    assert sorted(v for v in views if f"{v}:[" not in titles.group(1)) == []

    dispatch = re.search(r"if\(this\.state\.view==='solar'\).*", read("renderer.js"))
    assert dispatch, "the renderer no longer dispatches on the view"
    named = set(re.findall(r"this\.state\.view==='(\w+)'", dispatch.group(0)))
    # One view is the trailing else and so is never named.
    assert len(views - named) <= 1, f"views with no branch: {sorted(views - named)}"


def test_place_times_are_requested_for_the_day_on_screen():
    # Without the day, the panel goes on showing today's sunrise while the time machine
    # sits in December. It reads as correct, which is what makes it worth a test.
    request = re.search(r"fetch\(`/api/\$\{name\}[^`]*`\)", read("app.js"))

    assert request, "the place detail request is gone"
    assert "&on=" in request.group(0), request.group(0)


def test_text_from_the_server_is_escaped_before_it_becomes_markup():
    script = read("app.js")

    card = re.search(r'button\.innerHTML=`<span class="mini-planet star".*?`;', script, re.S)
    assert card, "the place card markup is gone"
    assert "escapeHtml(place.name)" in card.group(0)

    milky = re.search(r"function milkyCopy\(milky\)\{.*?\n\}", script, re.S)
    assert milky, "milkyCopy is gone"
    interpolated = re.findall(r"\$\{(.+?)\}(?![^`]*`\s*;?\s*$)", milky.group(0))
    assert interpolated, "milkyCopy interpolates nothing, which is unexpected"
    assert all("escapeHtml(" in expression for expression in interpolated), interpolated

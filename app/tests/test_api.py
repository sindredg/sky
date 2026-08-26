from fastapi.testclient import TestClient

from app.src.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.text.strip() == "healthy"


def test_places_are_listed():
    body = client.get("/api/places").json()
    assert any(p["slug"] == "lofoten" for p in body["places"])


def test_light_for_a_known_place():
    body = client.get("/api/light?place=lofoten&on=2026-06-21").json()
    assert body["midnight_sun"] is True
    assert body["sunset"] is None


def test_unknown_place_is_404():
    assert client.get("/api/light?place=atlantis").status_code == 404


def test_missing_location_is_400():
    assert client.get("/api/light").status_code == 400


def test_bad_date_is_400():
    assert client.get("/api/light?place=lofoten&on=yesterday").status_code == 400


def test_latitude_out_of_range_is_422():
    assert client.get("/api/light?lat=100&lon=0").status_code == 422


def test_place_reports_its_timezone():
    body = client.get("/api/light?place=tromso&on=2026-12-21").json()
    assert body["timezone"] == "Europe/Oslo"
    assert body["polar_night"] is True


def test_moon_endpoint_reports_a_phase():
    body = client.get("/api/moon?place=lofoten&on=2026-03-03").json()
    assert body["phase"] == "full moon"
    assert body["illumination"] > 0.99


def test_moon_endpoint_rejects_unknown_place():
    assert client.get("/api/moon?place=atlantis").status_code == 404


def test_eclipses_endpoint_finds_the_2026_pair():
    body = client.get("/api/eclipses?since=2026-01-01&days=365").json()
    dates = {(e["at"][:10], e["kind"]) for e in body["eclipses"]}
    assert ("2026-08-12", "solar") in dates
    assert ("2026-03-03", "lunar") in dates


def test_eclipses_window_is_capped():
    assert client.get("/api/eclipses?days=99999").status_code == 422


def test_version_reports_the_configured_build(monkeypatch):
    monkeypatch.setenv("SERVICE_VERSION", "abc123")

    import importlib

    from app.src import main as main_module

    reloaded = importlib.reload(main_module)
    try:
        with TestClient(reloaded.app) as client:
            body = client.get("/version").json()
        assert body["version"] == "abc123"
    finally:
        monkeypatch.delenv("SERVICE_VERSION", raising=False)
        importlib.reload(main_module)

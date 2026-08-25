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

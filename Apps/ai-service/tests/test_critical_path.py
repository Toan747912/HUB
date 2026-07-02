from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_echo():
    res = client.post("/api/echo", json={"prompt": "hello"})
    assert res.status_code == 200
    body = res.json()
    assert body["prompt"] == "hello"
    assert body["response"] == "Echo: hello"


def test_echo_missing_field_returns_422():
    res = client.post("/api/echo", json={})
    assert res.status_code == 422


def test_unknown_route_returns_404():
    res = client.get("/api/unknown")
    assert res.status_code == 404

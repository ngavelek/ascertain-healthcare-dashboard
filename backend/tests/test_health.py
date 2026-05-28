# Automated tests that check that /health works

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Start FastAPI in memory --> call health --> check status code (200) --> json is response is exaclty right
def test_health_check_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
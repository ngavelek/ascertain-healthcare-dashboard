from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Patient
from app.seed import seed_patients

client = TestClient(app)


def reset_database(seed_count: int = 20) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_patients(db, target_count=seed_count)
    finally:
        db.close()


def test_list_patients_supports_pagination_search_filter_and_sort() -> None:
    reset_database(seed_count=30)

    response = client.get(
        "/patients",
        params={
            "page": 1,
            "page_size": 5,
            "search": "Ava",
            "status": "active",
            "sort_by": "last_visit_at",
            "sort_dir": "desc",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 5
    assert body["total"] >= 1
    assert len(body["items"]) <= 5
    assert all(item["status"] == "active" for item in body["items"])
    assert all("Ava" in item["first_name"] for item in body["items"])
    assert "age" in body["items"][0]


def test_patient_stats_counts_statuses_and_recent_visits() -> None:
    reset_database(seed_count=20)

    response = client.get("/patients/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 20
    assert body["active"] == 12
    assert body["needs_review"] == 4
    assert body["inactive"] == 4
    assert body["recent_visits"] == 5
    assert body["recent_visit_days"] == 30


def test_create_read_update_and_delete_patient() -> None:
    reset_database(seed_count=5)

    payload = {
        "first_name": "Nora",
        "last_name": "Williams",
        "date_of_birth": "1984-03-14",
        "phone": "555-0100",
        "email": "nora.williams@example.com",
        "address_line_1": "500 Care Team Lane",
        "city": "Tampa",
        "state": "fl",
        "zip_code": "33602",
        "blood_type": "O+",
        "status": "needs_review",
        "conditions": ["Hypertension"],
        "allergies": ["Penicillin"],
        "last_visit_at": str(date.today()),
    }

    create_response = client.post("/patients", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    patient_id = created["id"]
    assert created["state"] == "FL"
    assert created["status"] == "needs_review"

    read_response = client.get(f"/patients/{patient_id}")
    assert read_response.status_code == 200
    assert read_response.json()["email"] == "nora.williams@example.com"

    update_response = client.put(
        f"/patients/{patient_id}",
        json={"status": "active", "conditions": ["Hypertension", "Asthma"]},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "active"
    assert updated["conditions"] == ["Hypertension", "Asthma"]

    delete_response = client.delete(f"/patients/{patient_id}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/patients/{patient_id}")
    assert missing_response.status_code == 404
    assert "not found" in missing_response.json()["detail"]


def test_patient_validation_returns_useful_errors() -> None:
    reset_database(seed_count=1)

    response = client.post(
        "/patients",
        json={
            "first_name": " ",
            "last_name": "Taylor",
            "date_of_birth": "2099-01-01",
            "status": "unknown",
        },
    )

    assert response.status_code == 422
    error_text = str(response.json()["detail"])
    assert "must not be blank" in error_text
    assert "date_of_birth cannot be in the future" in error_text


def test_list_patients_rejects_invalid_sort_and_status() -> None:
    reset_database(seed_count=5)

    invalid_sort_response = client.get("/patients", params={"sort_by": "email"})
    assert invalid_sort_response.status_code == 422
    assert "sort_by must be one of" in invalid_sort_response.json()["detail"]

    invalid_status_response = client.get(
        "/patients",
        params={"status": "archived"},
    )
    assert invalid_status_response.status_code == 422
    assert "status must be one of" in invalid_status_response.json()["detail"]


def test_patient_payload_validation_rejects_invalid_email_blood_type_and_lists() -> None:
    reset_database(seed_count=1)

    response = client.post(
        "/patients",
        json={
            "first_name": "Nora",
            "last_name": "Williams",
            "date_of_birth": "1984-03-14",
            "email": "not-an-email",
            "blood_type": "Z+",
            "conditions": "Hypertension",
        },
    )

    assert response.status_code == 422
    error_text = str(response.json()["detail"])
    assert "must be a valid email address" in error_text
    assert "must be a valid blood type" in error_text
    assert "must be a list" in error_text


def test_patient_update_rejects_null_required_fields() -> None:
    reset_database(seed_count=1)

    db = SessionLocal()
    try:
        patient = db.scalars(select(Patient)).first()
        assert patient is not None
        patient_id = patient.id
    finally:
        db.close()

    response = client.put(
        f"/patients/{patient_id}",
        json={"first_name": None, "date_of_birth": None, "status": None},
    )

    assert response.status_code == 422
    assert "must not be null" in str(response.json()["detail"])


def test_get_missing_patient_returns_404() -> None:
    reset_database(seed_count=1)

    response = client.get("/patients/not-a-real-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not-a-real-id was not found."


def test_delete_patient_removes_record_from_database() -> None:
    reset_database(seed_count=1)

    db = SessionLocal()
    try:
        patient = db.scalars(select(Patient)).first()
        assert patient is not None
        patient_id = patient.id
    finally:
        db.close()

    response = client.delete(f"/patients/{patient_id}")

    assert response.status_code == 204

    db = SessionLocal()
    try:
        assert db.get(Patient, patient_id) is None
    finally:
        db.close()

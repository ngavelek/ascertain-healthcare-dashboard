from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Patient, PatientNote
from app.seed import seed_patients

client = TestClient(app)


def reset_database(seed_count: int = 3) -> str:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_patients(db, target_count=seed_count)
        patient = db.scalars(select(Patient)).first()
        assert patient is not None
        return patient.id
    finally:
        db.close()


def test_create_list_and_delete_patient_note() -> None:
    patient_id = reset_database()

    create_response = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Blood pressure improved after medication adjustment."},
    )
    assert create_response.status_code == 201
    note = create_response.json()
    assert note["patient_id"] == patient_id
    assert note["content"] == "Blood pressure improved after medication adjustment."

    list_response = client.get(f"/patients/{patient_id}/notes")
    assert list_response.status_code == 200
    notes = list_response.json()
    assert len(notes) == 1
    assert notes[0]["id"] == note["id"]

    delete_response = client.delete(f"/patients/{patient_id}/notes/{note['id']}")
    assert delete_response.status_code == 204

    empty_response = client.get(f"/patients/{patient_id}/notes")
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_note_validation_and_missing_patient_errors() -> None:
    patient_id = reset_database()

    blank_response = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "   "},
    )
    assert blank_response.status_code == 422
    assert "note content must not be blank" in str(blank_response.json()["detail"])

    missing_response = client.post(
        "/patients/not-a-patient/notes",
        json={"content": "Follow-up scheduled."},
    )
    assert missing_response.status_code == 404
    assert "not found" in missing_response.json()["detail"]


def test_patient_summary_is_deterministic_and_uses_notes() -> None:
    patient_id = reset_database()
    client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Patient reports better sleep and reduced headaches."},
    )

    response = client.get(f"/patients/{patient_id}/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == patient_id
    assert "Patient reports better sleep" in body["summary"]
    assert any("note" in highlight for highlight in body["highlights"])


def test_deleting_patient_removes_notes() -> None:
    patient_id = reset_database()
    client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Care plan reviewed with patient."},
    )

    delete_response = client.delete(f"/patients/{patient_id}")
    assert delete_response.status_code == 204

    db = SessionLocal()
    try:
        orphaned_notes = db.scalars(
            select(PatientNote).where(PatientNote.patient_id == patient_id)
        ).all()
        assert orphaned_notes == []
    finally:
        db.close()

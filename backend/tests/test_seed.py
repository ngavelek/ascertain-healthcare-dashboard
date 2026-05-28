from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.models import Patient
from app.seed import seed_patients


def test_seed_patients_creates_realistic_sample_data() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        created_count = seed_patients(db, target_count=20)
        patients = db.scalars(select(Patient)).all()

        assert created_count == 20
        assert len(patients) == 20
        assert patients[0].first_name
        assert patients[0].last_name
        assert patients[0].date_of_birth
        assert isinstance(patients[0].conditions, list)
        assert isinstance(patients[0].allergies, list)
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Patient

FIRST_NAMES = [
    "Ava", "Liam", "Mia", "Noah", "Sophia", "Ethan", "Isabella", "Lucas",
    "Amelia", "Mason", "Harper", "Logan", "Evelyn", "James", "Charlotte",
    "Benjamin", "Abigail", "Elijah", "Emily", "Daniel",
]

LAST_NAMES = [
    "Johnson", "Martinez", "Patel", "Nguyen", "Brown", "Garcia", "Smith",
    "Davis", "Wilson", "Anderson", "Thomas", "Moore", "Taylor", "Jackson",
    "White", "Harris", "Martin", "Thompson", "Clark", "Lewis",
]

CONDITIONS = [
    ["Hypertension"],
    ["Type 2 Diabetes"],
    ["Asthma"],
    ["Hyperlipidemia"],
    ["Migraine"],
    ["GERD"],
    ["Anxiety"],
    ["Hypothyroidism"],
    ["Osteoarthritis"],
    [],
]

ALLERGIES = [
    ["Penicillin"],
    ["Sulfa drugs"],
    ["Latex"],
    ["Peanuts"],
    ["Shellfish"],
    ["Iodine"],
    [],
    [],
    [],
    [],
]

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
STATUSES = ["active", "active", "active", "needs_review", "inactive"]


def seed_patients(db: Session, target_count: int = 120) -> int:
    existing_count = db.scalar(select(Patient).limit(1)) is not None
    if existing_count:
        return 0

    today = date.today()
    patients: list[Patient] = []

    for index in range(target_count):
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(index * 3) % len(LAST_NAMES)]

        birth_year = 1945 + (index % 55)
        birth_month = (index % 12) + 1
        birth_day = (index % 27) + 1

        patient = Patient(
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date(birth_year, birth_month, birth_day),
            phone=f"555-01{index:03d}",
            email=f"{first_name.lower()}.{last_name.lower()}{index}@example.com",
            address_line_1=f"{100 + index} Bay Medical Way",
            city="St. Petersburg",
            state="FL",
            zip_code=f"337{index % 10:02d}",
            blood_type=BLOOD_TYPES[index % len(BLOOD_TYPES)],
            status=STATUSES[index % len(STATUSES)],
            conditions=CONDITIONS[index % len(CONDITIONS)],
            allergies=ALLERGIES[index % len(ALLERGIES)],
            last_visit_at=today - timedelta(days=(index * 7) % 365),
        )
        patients.append(patient)

    db.add_all(patients)
    db.commit()

    return len(patients)
from datetime import date, datetime, timedelta, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Patient, PatientNote
from app.schemas import (
    PatientCreate,
    PatientListResponse,
    PatientNoteCreate,
    PatientNoteRead,
    PatientRead,
    PatientStats,
    PatientSummary,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["patients"])

SORT_COLUMNS = {
    "name": (Patient.last_name, Patient.first_name),
    "last_visit_at": (Patient.last_visit_at,),
    "status": (Patient.status,),
    "created_at": (Patient.created_at,),
    "date_of_birth": (Patient.date_of_birth,),
}


def get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} was not found.",
        )
    return patient


def get_note_or_404(db: Session, patient_id: str, note_id: str) -> PatientNote:
    note = db.scalar(
        select(PatientNote).where(
            PatientNote.id == note_id,
            PatientNote.patient_id == patient_id,
        )
    )
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note {note_id} was not found for patient {patient_id}.",
        )
    return note


def format_field_list(values: list[str], empty: str = "none recorded") -> str:
    return ", ".join(values) if values else empty


def build_patient_summary(patient: Patient, notes: list[PatientNote]) -> PatientSummary:
    full_name = f"{patient.first_name} {patient.last_name}"
    status_text = patient.status.replace("_", " ")
    conditions = format_field_list(patient.conditions)
    allergies = format_field_list(patient.allergies)
    last_visit = (
        patient.last_visit_at.isoformat() if patient.last_visit_at else "not recorded"
    )
    note_count = len(notes)
    latest_note = notes[0].content if notes else "No clinical notes have been recorded."

    summary = (
        f"{full_name} is a {patient.age}-year-old patient with status "
        f"{status_text}. Last visit is {last_visit}. Active conditions: "
        f"{conditions}. Allergies: {allergies}. Latest note: {latest_note}"
    )

    highlights = [
        f"Status: {status_text}.",
        f"Last visit: {last_visit}.",
        f"{note_count} note{'s' if note_count != 1 else ''} recorded.",
    ]

    if patient.status == "needs_review":
        highlights.append("Care team review is currently flagged.")

    if patient.allergies:
        highlights.append(f"Allergy review: {allergies}.")

    return PatientSummary(
        patient_id=patient.id,
        generated_at=datetime.now(timezone.utc),
        summary=summary,
        highlights=highlights,
    )


def apply_patient_filters(
    query: Select[tuple[Patient]],
    search: str | None,
    patient_status: str | None,
) -> Select[tuple[Patient]]:
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Patient.first_name.ilike(term),
                Patient.last_name.ilike(term),
                Patient.email.ilike(term),
                Patient.phone.ilike(term),
            )
        )

    if patient_status:
        query = query.where(Patient.status == patient_status)

    return query


@router.get("", response_model=PatientListResponse)
def list_patients(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    status_filter: str | None = Query(default=None, alias="status"),
    sort_by: str = Query(default="name"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
) -> PatientListResponse:
    if status_filter not in {None, "active", "needs_review", "inactive"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="status must be one of active, needs_review, or inactive.",
        )

    if sort_by not in SORT_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"sort_by must be one of {', '.join(SORT_COLUMNS)}.",
        )

    filtered_query = apply_patient_filters(
        select(Patient),
        search=search,
        patient_status=status_filter,
    )

    total = db.scalar(select(func.count()).select_from(filtered_query.subquery())) or 0
    columns = SORT_COLUMNS[sort_by]
    sort_expressions = []

    for column in columns:
        expression = column.desc() if sort_dir == "desc" else column.asc()
        sort_expressions.append(expression.nulls_last())

    offset = (page - 1) * page_size
    patients = db.scalars(
        filtered_query.order_by(*sort_expressions).offset(offset).limit(page_size)
    ).all()

    return PatientListResponse(
        items=patients,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total else 0,
    )


@router.get("/stats", response_model=PatientStats)
def get_patient_stats(db: Session = Depends(get_db)) -> PatientStats:
    recent_visit_days = 30
    recent_visit_cutoff = date.today() - timedelta(days=recent_visit_days)
    status_counts = dict(
        db.execute(
            select(Patient.status, func.count(Patient.id)).group_by(Patient.status)
        ).all()
    )

    return PatientStats(
        total=sum(status_counts.values()),
        active=status_counts.get("active", 0),
        needs_review=status_counts.get("needs_review", 0),
        inactive=status_counts.get("inactive", 0),
        recent_visits=db.scalar(
            select(func.count(Patient.id)).where(
                Patient.last_visit_at >= recent_visit_cutoff
            )
        )
        or 0,
        recent_visit_days=recent_visit_days,
    )


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: str, db: Session = Depends(get_db)) -> Patient:
    return get_patient_or_404(db, patient_id)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)) -> Patient:
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
) -> Patient:
    patient = get_patient_or_404(db, patient_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: str, db: Session = Depends(get_db)) -> Response:
    patient = get_patient_or_404(db, patient_id)
    db.delete(patient)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{patient_id}/notes",
    response_model=PatientNoteRead,
    status_code=status.HTTP_201_CREATED,
)
def create_patient_note(
    patient_id: str,
    payload: PatientNoteCreate,
    db: Session = Depends(get_db),
) -> PatientNote:
    get_patient_or_404(db, patient_id)
    note = PatientNote(patient_id=patient_id, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{patient_id}/notes", response_model=list[PatientNoteRead])
def list_patient_notes(
    patient_id: str,
    db: Session = Depends(get_db),
) -> list[PatientNote]:
    get_patient_or_404(db, patient_id)
    return db.scalars(
        select(PatientNote)
        .where(PatientNote.patient_id == patient_id)
        .order_by(PatientNote.created_at.desc(), PatientNote.id.desc())
    ).all()


@router.delete(
    "/{patient_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_patient_note(
    patient_id: str,
    note_id: str,
    db: Session = Depends(get_db),
) -> Response:
    get_patient_or_404(db, patient_id)
    note = get_note_or_404(db, patient_id, note_id)
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{patient_id}/summary", response_model=PatientSummary)
def get_patient_summary(
    patient_id: str,
    db: Session = Depends(get_db),
) -> PatientSummary:
    patient = get_patient_or_404(db, patient_id)
    notes = db.scalars(
        select(PatientNote)
        .where(PatientNote.patient_id == patient_id)
        .order_by(PatientNote.created_at.desc(), PatientNote.id.desc())
    ).all()
    return build_patient_summary(patient, notes)

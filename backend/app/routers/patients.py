from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Patient
from app.schemas import PatientCreate, PatientListResponse, PatientRead, PatientUpdate

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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be one of active, needs_review, or inactive.",
        )

    if sort_by not in SORT_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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


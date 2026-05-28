from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PatientStatus = Literal["active", "needs_review", "inactive"]

BLOOD_TYPES = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


def strip_required_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


def strip_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def normalize_state(value: str | None) -> str | None:
    return value.upper() if value else None


def validate_blood_type(value: str | None) -> str | None:
    if value is not None and value not in BLOOD_TYPES:
        raise ValueError("must be a valid blood type")
    return value


def validate_date_of_birth(value: date) -> date:
    if value > date.today():
        raise ValueError("date_of_birth cannot be in the future")
    return value


def validate_optional_date_of_birth(value: date | None) -> date | None:
    if value is not None:
        return validate_date_of_birth(value)
    return None


def validate_last_visit(value: date | None) -> date | None:
    if value is not None and value > date.today():
        raise ValueError("last_visit_at cannot be in the future")
    return value


def normalize_string_list(value: list[str] | None) -> list[str]:
    if value is None:
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def strip_note_content(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("note content must not be blank")
    return cleaned


class PatientBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)
    address_line_1: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    zip_code: str | None = Field(default=None, max_length=20)
    blood_type: str | None = Field(default=None, max_length=5)
    status: PatientStatus = "active"
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    last_visit_at: date | None = None

    _strip_required_text = field_validator("first_name", "last_name")(
        strip_required_text
    )
    _strip_optional_text = field_validator(
        "phone",
        "email",
        "address_line_1",
        "city",
        "state",
        "zip_code",
        "blood_type",
        mode="before",
    )(strip_optional_text)
    _normalize_state = field_validator("state")(normalize_state)
    _validate_blood_type = field_validator("blood_type")(validate_blood_type)
    _validate_date_of_birth = field_validator("date_of_birth")(
        validate_date_of_birth
    )
    _validate_last_visit = field_validator("last_visit_at")(validate_last_visit)
    _normalize_string_list = field_validator("conditions", "allergies", mode="before")(
        normalize_string_list
    )


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)
    address_line_1: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    zip_code: str | None = Field(default=None, max_length=20)
    blood_type: str | None = Field(default=None, max_length=5)
    status: PatientStatus | None = None
    conditions: list[str] | None = None
    allergies: list[str] | None = None
    last_visit_at: date | None = None

    _strip_required_text = field_validator("first_name", "last_name")(
        strip_required_text
    )
    _strip_optional_text = field_validator(
        "phone",
        "email",
        "address_line_1",
        "city",
        "state",
        "zip_code",
        "blood_type",
        mode="before",
    )(strip_optional_text)
    _normalize_state = field_validator("state")(normalize_state)
    _validate_blood_type = field_validator("blood_type")(validate_blood_type)
    _validate_date_of_birth = field_validator("date_of_birth")(
        validate_optional_date_of_birth
    )
    _validate_last_visit = field_validator("last_visit_at")(validate_last_visit)
    _normalize_string_list = field_validator(
        "conditions",
        "allergies",
        mode="before",
    )(normalize_string_list)


class PatientRead(PatientBase):
    id: str
    age: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientListResponse(BaseModel):
    items: list[PatientRead]
    total: int
    page: int
    page_size: int
    pages: int


class PatientStats(BaseModel):
    total: int
    active: int
    needs_review: int
    inactive: int
    recent_visits: int
    recent_visit_days: int


class PatientNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    _strip_content = field_validator("content")(strip_note_content)


class PatientNoteRead(BaseModel):
    id: str
    patient_id: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientSummary(BaseModel):
    patient_id: str
    generated_at: datetime
    summary: str
    highlights: list[str]

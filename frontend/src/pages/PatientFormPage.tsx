import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, createPatient, getPatient, updatePatient } from "../api/client";
import type { Patient, PatientPayload, PatientStatus } from "../api/types";

type PatientFormPageProps = {
  mode: "create" | "edit";
};

type PatientFormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  blood_type: string;
  status: PatientStatus;
  conditions: string;
  allergies: string;
  last_visit_at: string;
};

type FormErrors = Partial<Record<keyof PatientFormState | "form", string>>;

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const INITIAL_FORM_STATE: PatientFormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  phone: "",
  email: "",
  address_line_1: "",
  city: "",
  state: "",
  zip_code: "",
  blood_type: "",
  status: "active",
  conditions: "",
  allergies: "",
  last_visit_at: "",
};

function toFormState(patient: Patient): PatientFormState {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address_line_1: patient.address_line_1 ?? "",
    city: patient.city ?? "",
    state: patient.state ?? "",
    zip_code: patient.zip_code ?? "",
    blood_type: patient.blood_type ?? "",
    status: patient.status,
    conditions: patient.conditions.join(", "),
    allergies: patient.allergies.join(", "),
    last_visit_at: patient.last_visit_at ?? "",
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function todayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPayload(form: PatientFormState): PatientPayload {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    date_of_birth: form.date_of_birth,
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    address_line_1: emptyToNull(form.address_line_1),
    city: emptyToNull(form.city),
    state: emptyToNull(form.state)?.toUpperCase() ?? null,
    zip_code: emptyToNull(form.zip_code),
    blood_type: emptyToNull(form.blood_type),
    status: form.status,
    conditions: parseList(form.conditions),
    allergies: parseList(form.allergies),
    last_visit_at: emptyToNull(form.last_visit_at),
  };
}

function isFutureDate(value: string) {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${value}T00:00:00`);
  return selected > today;
}

function validateForm(form: PatientFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.first_name.trim()) {
    errors.first_name = "First name is required.";
  }

  if (!form.last_name.trim()) {
    errors.last_name = "Last name is required.";
  }

  if (!form.date_of_birth) {
    errors.date_of_birth = "Date of birth is required.";
  } else if (isFutureDate(form.date_of_birth)) {
    errors.date_of_birth = "Date of birth cannot be in the future.";
  }

  if (form.last_visit_at && isFutureDate(form.last_visit_at)) {
    errors.last_visit_at = "Last visit cannot be in the future.";
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (form.state.trim() && !/^[A-Za-z]{2}$/.test(form.state.trim())) {
    errors.state = "Use a two-letter state code.";
  }

  if (!BLOOD_TYPES.includes(form.blood_type)) {
    errors.blood_type = "Choose a valid blood type.";
  }

  return errors;
}

function getFormErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to save patient.";
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

function ParsedListPreview({ value }: { value: string }) {
  const items = parseList(value);

  if (!items.length) {
    return null;
  }

  return (
    <div className="form-chip-preview" aria-label="Parsed entries preview">
      {items.map((item) => (
        <span className="chip" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function PatientFormPage({ mode }: PatientFormPageProps) {
  const { id } = useParams();
  const patientId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEdit = mode === "edit";
  const today = todayDateInputValue();
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: isEdit && Boolean(patientId),
  });

  useEffect(() => {
    if (isEdit && patientQuery.data) {
      setForm(toFormState(patientQuery.data));
    }
  }, [isEdit, patientQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: PatientPayload) => {
      if (isEdit) {
        return updatePatient(patientId, payload);
      }
      return createPatient(payload);
    },
    onSuccess: async (patient) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["patient", patient.id] }),
      ]);
      navigate(`/patients/${patient.id}`);
    },
  });

  function updateField<K extends keyof PatientFormState>(
    field: K,
    value: PatientFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    saveMutation.mutate(buildPayload(form));
  }

  if (isEdit && !patientId) {
    return (
      <section className="page-section">
        <div className="state-panel state-panel--error">Patient not found.</div>
      </section>
    );
  }

  if (isEdit && patientQuery.isLoading) {
    return (
      <section className="page-section">
        <div className="state-panel">Loading patient</div>
      </section>
    );
  }

  if (isEdit && patientQuery.isError) {
    return (
      <section className="page-section">
        <Link className="button button--secondary" to="/patients">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Patients</span>
        </Link>
        <div className="state-panel state-panel--error">
          {getFormErrorMessage(patientQuery.error)}
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-toolbar">
        <div className="page-heading">
          <p className="eyebrow">Patient record</p>
          <h1>{isEdit ? "Edit patient" : "New patient"}</h1>
        </div>
        <Link className="button button--secondary" to={isEdit ? `/patients/${patientId}` : "/patients"}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{isEdit ? "Patient" : "Patients"}</span>
        </Link>
      </div>

      <form className="patient-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Personal information</legend>
          <div className="form-grid">
            <label>
              <span>First name</span>
              <input
                value={form.first_name}
                onChange={(event) => updateField("first_name", event.target.value)}
                type="text"
                autoComplete="given-name"
              />
              <FieldError message={errors.first_name} />
            </label>

            <label>
              <span>Last name</span>
              <input
                value={form.last_name}
                onChange={(event) => updateField("last_name", event.target.value)}
                type="text"
                autoComplete="family-name"
              />
              <FieldError message={errors.last_name} />
            </label>

            <label>
              <span>Date of birth</span>
              <input
                value={form.date_of_birth}
                onChange={(event) => updateField("date_of_birth", event.target.value)}
                type="date"
                max={today}
              />
              <span className="field-helper">
                Use the calendar picker or enter YYYY-MM-DD.
              </span>
              <FieldError message={errors.date_of_birth} />
            </label>

            <label>
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                type="tel"
                autoComplete="tel"
              />
            </label>

            <label>
              <span>Email</span>
              <input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                type="email"
                autoComplete="email"
              />
              <FieldError message={errors.email} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Address</legend>
          <div className="form-grid">
            <label className="form-span-2">
              <span>Street address</span>
              <input
                value={form.address_line_1}
                onChange={(event) => updateField("address_line_1", event.target.value)}
                type="text"
                autoComplete="street-address"
              />
            </label>

            <label>
              <span>City</span>
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                type="text"
                autoComplete="address-level2"
              />
            </label>

            <label>
              <span>State</span>
              <input
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                type="text"
                autoComplete="address-level1"
                maxLength={2}
              />
              <FieldError message={errors.state} />
            </label>

            <label>
              <span>ZIP code</span>
              <input
                value={form.zip_code}
                onChange={(event) => updateField("zip_code", event.target.value)}
                type="text"
                autoComplete="postal-code"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Medical information</legend>
          <div className="form-grid">
            <label>
              <span>Patient status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as PatientStatus)
                }
              >
                <option value="active">Active</option>
                <option value="needs_review">Needs Review</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="field-helper">
                Use status to indicate whether a patient is active, inactive, or
                needs staff review.
              </span>
            </label>

            <label>
              <span>Blood type</span>
              <select
                value={form.blood_type}
                onChange={(event) => updateField("blood_type", event.target.value)}
              >
                <option value="">Not recorded</option>
                {BLOOD_TYPES.filter(Boolean).map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {bloodType}
                  </option>
                ))}
              </select>
              <FieldError message={errors.blood_type} />
            </label>

            <label>
              <span>Last visit date</span>
              <input
                value={form.last_visit_at}
                onChange={(event) => updateField("last_visit_at", event.target.value)}
                type="date"
                max={today}
              />
              <span className="field-helper">
                Optional. Use the calendar picker or enter YYYY-MM-DD.
              </span>
              <FieldError message={errors.last_visit_at} />
            </label>

            <label className="form-span-2">
              <span>Conditions</span>
              <textarea
                value={form.conditions}
                onChange={(event) => updateField("conditions", event.target.value)}
                rows={3}
              />
              <span className="field-helper">
                Separate multiple conditions with commas, e.g. Hypertension,
                Asthma.
              </span>
              <ParsedListPreview value={form.conditions} />
            </label>

            <label className="form-span-2">
              <span>Allergies</span>
              <textarea
                value={form.allergies}
                onChange={(event) => updateField("allergies", event.target.value)}
                rows={3}
              />
              <span className="field-helper">
                Separate multiple allergies with commas, e.g. Penicillin, Latex.
              </span>
              <ParsedListPreview value={form.allergies} />
            </label>
          </div>
        </fieldset>

        {saveMutation.isError ? (
          <p className="form-error">{getFormErrorMessage(saveMutation.error)}</p>
        ) : null}
        {errors.form ? <p className="form-error">{errors.form}</p> : null}

        <div className="form-actions">
          <button
            className="button button--primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            <Save size={18} aria-hidden="true" />
            <span>{saveMutation.isPending ? "Saving" : "Save patient"}</span>
          </button>
          <Link
            className="button button--secondary"
            to={isEdit ? `/patients/${patientId}` : "/patients"}
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

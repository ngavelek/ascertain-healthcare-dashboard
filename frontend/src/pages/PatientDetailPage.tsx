import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Droplets,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ApiError, getPatient } from "../api/client";
import type { Patient } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, fullName, patientLocation } from "../utils/format";

function getDetailErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return "Patient not found.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load patient.";
}

function joinList(items: string[]) {
  return items.length ? items : ["None recorded"];
}

function DemographicDetails({ patient }: { patient: Patient }) {
  return (
    <section className="detail-section">
      <h2>Demographics</h2>
      <dl className="detail-list">
        <div>
          <dt>Date of birth</dt>
          <dd>{formatDate(patient.date_of_birth)}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd>{patient.age}</dd>
        </div>
        <div>
          <dt>Last visit</dt>
          <dd>{formatDate(patient.last_visit_at)}</dd>
        </div>
        <div>
          <dt>Blood type</dt>
          <dd>{patient.blood_type ?? "Not recorded"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ContactDetails({ patient }: { patient: Patient }) {
  return (
    <section className="detail-section">
      <h2>Contact</h2>
      <dl className="detail-list">
        <div>
          <dt>Phone</dt>
          <dd>{patient.phone ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{patient.email ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {[patient.address_line_1, patientLocation(patient), patient.zip_code]
              .filter(Boolean)
              .join(", ") || "Not recorded"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function MedicalDetails({ patient }: { patient: Patient }) {
  return (
    <section className="detail-section">
      <h2>Clinical profile</h2>
      <div className="clinical-lists">
        <div>
          <h3>Conditions</h3>
          <div className="chip-list">
            {joinList(patient.conditions).map((condition) => (
              <span key={condition} className="chip">
                {condition}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Allergies</h3>
          <div className="chip-list">
            {joinList(patient.allergies).map((allergy) => (
              <span key={allergy} className="chip chip--warning">
                {allergy}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PatientDetailPage() {
  const { id } = useParams();
  const patientId = id ?? "";
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: Boolean(patientId),
  });

  if (!patientId) {
    return (
      <section className="page-section">
        <div className="state-panel state-panel--error">Patient not found.</div>
      </section>
    );
  }

  if (patientQuery.isLoading) {
    return (
      <section className="page-section">
        <div className="state-panel">Loading patient</div>
      </section>
    );
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <section className="page-section">
        <Link className="button button--secondary" to="/patients">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Patients</span>
        </Link>
        <div className="state-panel state-panel--error">
          {getDetailErrorMessage(patientQuery.error)}
        </div>
      </section>
    );
  }

  const patient = patientQuery.data;

  return (
    <section className="page-section">
      <div className="page-toolbar">
        <Link className="button button--secondary" to="/patients">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Patients</span>
        </Link>
        <Link className="button button--primary" to={`/patients/${patient.id}/edit`}>
          <Pencil size={18} aria-hidden="true" />
          <span>Edit patient</span>
        </Link>
      </div>

      <div className="patient-hero">
        <div>
          <p className="eyebrow">Patient record</p>
          <h1>{fullName(patient)}</h1>
          <div className="patient-hero__meta">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              Last visit {formatDate(patient.last_visit_at)}
            </span>
            <span>
              <Droplets size={16} aria-hidden="true" />
              {patient.blood_type ?? "Blood type not recorded"}
            </span>
          </div>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      <div className="quick-contact" aria-label="Patient contact summary">
        <span>
          <Phone size={16} aria-hidden="true" />
          {patient.phone ?? "No phone"}
        </span>
        <span>
          <Mail size={16} aria-hidden="true" />
          {patient.email ?? "No email"}
        </span>
        <span>
          <MapPin size={16} aria-hidden="true" />
          {patientLocation(patient) || "No location"}
        </span>
      </div>

      <div className="detail-grid">
        <DemographicDetails patient={patient} />
        <ContactDetails patient={patient} />
        <MedicalDetails patient={patient} />
      </div>
    </section>
  );
}

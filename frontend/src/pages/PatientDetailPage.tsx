import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Droplets,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ApiError,
  createPatientNote,
  deletePatient,
  deletePatientNote,
  getPatient,
  getPatientNotes,
  getPatientSummary,
} from "../api/client";
import type { Patient, PatientNote } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  fullName,
  patientLocation,
} from "../utils/format";

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

function SummaryPanel({ patientId }: { patientId: string }) {
  const summaryQuery = useQuery({
    queryKey: ["patient-summary", patientId],
    queryFn: () => getPatientSummary(patientId),
  });

  return (
    <section className="summary-panel">
      <div className="section-title">
        <ClipboardList size={18} aria-hidden="true" />
        <h2>Generated summary</h2>
      </div>

      {summaryQuery.isLoading ? (
        <div className="state-panel">Loading summary</div>
      ) : null}

      {summaryQuery.isError ? (
        <div className="state-panel state-panel--error">
          {getDetailErrorMessage(summaryQuery.error)}
        </div>
      ) : null}

      {summaryQuery.data ? (
        <div className="summary-content">
          <p>{summaryQuery.data.summary}</p>
          <ul className="highlight-list">
            {summaryQuery.data.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          <span className="timestamp">
            Generated {formatDateTime(summaryQuery.data.generated_at)}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function NoteItem({
  note,
  onDelete,
  isDeleting,
}: {
  note: PatientNote;
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
}) {
  return (
    <li className="note-item">
      <div>
        <p>{note.content}</p>
        <span className="timestamp">{formatDateTime(note.created_at)}</span>
      </div>
      <button
        className="icon-button"
        disabled={isDeleting}
        type="button"
        onClick={() => onDelete(note.id)}
        aria-label="Delete note"
        title="Delete note"
      >
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </li>
  );
}

function NotesPanel({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [localError, setLocalError] = useState("");
  const notesQuery = useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: () => getPatientNotes(patientId),
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteContent: string) =>
      createPatientNote(patientId, { content: noteContent }),
    onSuccess: async () => {
      setContent("");
      setLocalError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["patient-summary", patientId] }),
      ]);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deletePatientNote(patientId, noteId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["patient-summary", patientId] }),
      ]);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setLocalError("Note content is required.");
      return;
    }

    createNoteMutation.mutate(trimmed);
  }

  function handleDeleteNote(noteId: string) {
    if (!window.confirm("Delete this note? This cannot be undone.")) {
      return;
    }

    deleteNoteMutation.mutate(noteId);
  }

  const notes = notesQuery.data ?? [];

  return (
    <section className="notes-panel">
      <div className="section-title">
        <FileText size={18} aria-hidden="true" />
        <h2>Notes</h2>
      </div>

      <form className="note-form" onSubmit={handleSubmit}>
        <label>
          <span className="sr-only">New note</span>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setLocalError("");
            }}
            maxLength={2000}
            rows={4}
            placeholder="Add a clinical note"
          />
        </label>
        {localError ? <p className="form-error">{localError}</p> : null}
        {createNoteMutation.isError ? (
          <p className="form-error">{getDetailErrorMessage(createNoteMutation.error)}</p>
        ) : null}
        <button
          className="button button--primary"
          type="submit"
          disabled={createNoteMutation.isPending}
        >
          <Send size={17} aria-hidden="true" />
          <span>{createNoteMutation.isPending ? "Saving" : "Add note"}</span>
        </button>
      </form>

      {notesQuery.isLoading ? <div className="state-panel">Loading notes</div> : null}

      {notesQuery.isError ? (
        <div className="state-panel state-panel--error">
          {getDetailErrorMessage(notesQuery.error)}
        </div>
      ) : null}

      {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
        <div className="state-panel">No notes recorded.</div>
      ) : null}

      {notes.length ? (
        <ul className="note-list">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isDeleting={deleteNoteMutation.isPending}
              onDelete={handleDeleteNote}
            />
          ))}
        </ul>
      ) : null}

      {deleteNoteMutation.isError ? (
        <p className="form-error">{getDetailErrorMessage(deleteNoteMutation.error)}</p>
      ) : null}
    </section>
  );
}

export function PatientDetailPage() {
  const { id } = useParams();
  const patientId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: Boolean(patientId),
  });
  const deletePatientMutation = useMutation({
    mutationFn: (deletedPatientId: string) => deletePatient(deletedPatientId),
    onSuccess: async (_data, deletedPatientId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["patient-stats"] }),
      ]);
      queryClient.removeQueries({ queryKey: ["patient", deletedPatientId] });
      queryClient.removeQueries({ queryKey: ["patient-notes", deletedPatientId] });
      queryClient.removeQueries({ queryKey: ["patient-summary", deletedPatientId] });
      navigate("/patients");
    },
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

  function handleDeletePatient() {
    deletePatientMutation.reset();
    setIsDeleteDialogOpen(true);
  }

  function confirmDeletePatient() {
    deletePatientMutation.mutate(patient.id);
  }

  return (
    <section className="page-section">
      <div className="page-toolbar">
        <Link className="button button--secondary" to="/patients">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Patients</span>
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
        <div className="patient-hero__actions">
          <StatusBadge status={patient.status} />
          <Link className="button button--secondary" to={`/patients/${patient.id}/edit`}>
            <Pencil size={18} aria-hidden="true" />
            <span>Edit patient</span>
          </Link>
        </div>
      </div>

      {deletePatientMutation.isError ? (
        <div className="state-panel state-panel--error">
          {getDetailErrorMessage(deletePatientMutation.error)}
        </div>
      ) : null}

      {isDeleteDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby="delete-patient-title"
            aria-modal="true"
            className="confirmation-dialog"
            role="dialog"
          >
            <div>
              <p className="eyebrow">Confirm deletion</p>
              <h2 id="delete-patient-title">Delete {fullName(patient)}?</h2>
              <p>
                This will remove the patient record and all notes. This action
                cannot be undone.
              </p>
            </div>
            {deletePatientMutation.isError ? (
              <p className="form-error">
                {getDetailErrorMessage(deletePatientMutation.error)}
              </p>
            ) : null}
            <div className="confirmation-actions">
              <button
                className="button button--secondary"
                disabled={deletePatientMutation.isPending}
                type="button"
                onClick={() => {
                  deletePatientMutation.reset();
                  setIsDeleteDialogOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className="button button--danger"
                disabled={deletePatientMutation.isPending}
                type="button"
                onClick={confirmDeletePatient}
              >
                <Trash2 size={18} aria-hidden="true" />
                <span>
                  {deletePatientMutation.isPending ? "Deleting" : "Delete patient"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      <SummaryPanel patientId={patient.id} />
      <NotesPanel patientId={patient.id} />

      <div className="danger-zone">
        <button
          className="button button--danger-outline"
          disabled={deletePatientMutation.isPending}
          type="button"
          onClick={handleDeletePatient}
        >
          <Trash2 size={18} aria-hidden="true" />
          <span>{deletePatientMutation.isPending ? "Deleting" : "Delete patient"}</span>
        </button>
      </div>
    </section>
  );
}

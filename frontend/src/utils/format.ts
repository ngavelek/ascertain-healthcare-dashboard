import type { Patient, PatientStatus } from "../api/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function fullName(patient: Pick<Patient, "first_name" | "last_name">) {
  return `${patient.first_name} ${patient.last_name}`;
}

export function formatDate(value: string | null) {
  if (!value) {
    return "No visit";
  }

  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatStatus(status: PatientStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function patientLocation(patient: Patient) {
  return [patient.city, patient.state].filter(Boolean).join(", ");
}


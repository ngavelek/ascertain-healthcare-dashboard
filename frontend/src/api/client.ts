import type {
  Patient,
  PatientListParams,
  PatientListResponse,
  PatientPayload,
} from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(formatApiError(status, detail));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function formatApiError(status: number, detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String(item.msg);
        }
        return "Validation error";
      })
      .join(" ");
  }

  return `Request failed with status ${status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function toSearchParams(params: PatientListParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function listPatients(params: PatientListParams = {}) {
  return request<PatientListResponse>(`/patients${toSearchParams(params)}`);
}

export function getPatient(id: string) {
  return request<Patient>(`/patients/${id}`);
}

export function createPatient(payload: PatientPayload) {
  return request<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePatient(id: string, payload: Partial<PatientPayload>) {
  return request<Patient>(`/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePatient(id: string) {
  return request<void>(`/patients/${id}`, {
    method: "DELETE",
  });
}


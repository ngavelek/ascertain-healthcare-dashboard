export type PatientStatus = "active" | "needs_review" | "inactive";

export type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  phone: string | null;
  email: string | null;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  blood_type: string | null;
  status: PatientStatus;
  conditions: string[];
  allergies: string[];
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientListResponse = {
  items: Patient[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type PatientListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: PatientStatus | "";
  sort_by?: "name" | "last_visit_at" | "status" | "created_at" | "date_of_birth";
  sort_dir?: "asc" | "desc";
};

export type PatientPayload = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone?: string | null;
  email?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  blood_type?: string | null;
  status: PatientStatus;
  conditions?: string[];
  allergies?: string[];
  last_visit_at?: string | null;
};

export type PatientNote = {
  id: string;
  patient_id: string;
  content: string;
  created_at: string;
};

export type PatientNotePayload = {
  content: string;
};

export type PatientSummary = {
  patient_id: string;
  generated_at: string;
  summary: string;
  highlights: string[];
};

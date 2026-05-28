import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { listPatients } from "../api/client";
import type { PatientListParams, PatientStatus } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, fullName, patientLocation } from "../utils/format";

const PATIENT_STATUSES: PatientStatus[] = ["active", "needs_review", "inactive"];
const SORT_BY_VALUES = [
  "name",
  "last_visit_at",
  "status",
  "created_at",
  "date_of_birth",
] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type SortBy = (typeof SORT_BY_VALUES)[number];

const SORT_LABELS: Record<SortBy, string> = {
  name: "Name",
  last_visit_at: "Last visit",
  status: "Status",
  created_at: "Created",
  date_of_birth: "Date of birth",
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPatientStatus(value: string | null): value is PatientStatus {
  return PATIENT_STATUSES.includes(value as PatientStatus);
}

function isSortBy(value: string | null): value is SortBy {
  return SORT_BY_VALUES.includes(value as SortBy);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load patients.";
}

export function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const requestedPageSize = parsePositiveInt(searchParams.get("page_size"), 20);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : 20;
  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const status: PatientStatus | "" = isPatientStatus(statusParam) ? statusParam : "";
  const sortByParam = searchParams.get("sort_by");
  const sortBy: SortBy = isSortBy(sortByParam) ? sortByParam : "name";
  const sortDir = searchParams.get("sort_dir") === "desc" ? "desc" : "asc";
  const [searchInput, setSearchInput] = useState(search);
  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const cleaned = deferredSearch.trim();
      if (cleaned === search) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (cleaned) {
        nextParams.set("search", cleaned);
      } else {
        nextParams.delete("search");
      }
      nextParams.set("page", "1");
      setSearchParams(nextParams, { replace: true });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [deferredSearch, search, searchParams, setSearchParams]);

  const patientParams = useMemo<PatientListParams>(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [page, pageSize, search, sortBy, sortDir, status],
  );

  const patientsQuery = useQuery({
    queryKey: ["patients", patientParams],
    queryFn: () => listPatients(patientParams),
    placeholderData: (previousData) => previousData,
  });

  function updateParams(updates: Record<string, string | number | undefined>) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  }

  const data = patientsQuery.data;
  const totalPages = data?.pages ?? 0;
  const hasPatients = Boolean(data?.items.length);
  const canGoBack = page > 1;
  const canGoForward = totalPages > 0 && page < totalPages;

  return (
    <section className="page-section">
      <div className="page-toolbar">
        <div className="page-heading">
          <p className="eyebrow">Patients</p>
          <h1>Patient directory</h1>
          <p>{data ? `${data.total} records` : "Loading records"}</p>
        </div>
        <Link className="button button--primary" to="/patients/new">
          <Plus size={18} aria-hidden="true" />
          <span>New patient</span>
        </Link>
      </div>

      <div className="directory-tools" aria-label="Patient directory controls">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search patients</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, or phone"
            type="search"
          />
        </label>

        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              updateParams({ status: event.target.value, page: 1 })
            }
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="needs_review">Needs review</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label>
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(event) =>
              updateParams({ sort_by: event.target.value, page: 1 })
            }
          >
            {SORT_BY_VALUES.map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Direction</span>
          <select
            value={sortDir}
            onChange={(event) =>
              updateParams({ sort_dir: event.target.value, page: 1 })
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>

        <label>
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) =>
              updateParams({ page_size: event.target.value, page: 1 })
            }
          >
            {PAGE_SIZE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {patientsQuery.isLoading ? (
        <div className="state-panel">Loading patients</div>
      ) : null}

      {patientsQuery.isError ? (
        <div className="state-panel state-panel--error">
          {getErrorMessage(patientsQuery.error)}
        </div>
      ) : null}

      {!patientsQuery.isLoading && !patientsQuery.isError && !hasPatients ? (
        <div className="state-panel">
          <SlidersHorizontal size={20} aria-hidden="true" />
          <span>No patients match the current filters.</span>
        </div>
      ) : null}

      {hasPatients && data ? (
        <div className="table-shell" aria-busy={patientsQuery.isFetching}>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Age</th>
                <th scope="col">Last visit</th>
                <th scope="col">Status</th>
                <th scope="col">Location</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <Link className="patient-name-link" to={`/patients/${patient.id}`}>
                      {fullName(patient)}
                    </Link>
                    <span className="table-subtext">{patient.email}</span>
                  </td>
                  <td>{patient.age}</td>
                  <td>{formatDate(patient.last_visit_at)}</td>
                  <td>
                    <StatusBadge status={patient.status} />
                  </td>
                  <td>{patientLocation(patient) || "Not recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="pagination-bar">
        <span>
          Page {totalPages ? page : 0} of {totalPages}
        </span>
        <div className="pagination-actions">
          <button
            className="icon-button"
            disabled={!canGoBack}
            onClick={() => updateParams({ page: page - 1 })}
            type="button"
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            disabled={!canGoForward}
            onClick={() => updateParams({ page: page + 1 })}
            type="button"
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

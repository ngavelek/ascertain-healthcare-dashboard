# ARCHITECTURE_TIMELINE.md

# Architecture Timeline

This document explains how the Ascertain healthcare dashboard evolved commit by commit. It is intended to be useful both for code review and for explaining the project in a follow-up engineering interview.

## Purpose

This project is a full-stack patient management dashboard for a medical practice. It is built with:

* React TypeScript frontend
* FastAPI backend
* PostgreSQL database through Docker Compose
* synthetic patient data
* deterministic patient summaries
* patient notes workflow

The project is built incrementally so each commit represents a working milestone.

## Current Architecture Snapshot

```mermaid
flowchart TD
  User[Medical Practice User] --> Web[React TypeScript Frontend]
  Web --> API[FastAPI Backend]
  API --> DB[(PostgreSQL)]
  API --> Summary[Deterministic Summary Logic]
  API --> Notes[Patient Notes Workflow]
```

## Commit Timeline

### 1. FastAPI foundation

**Commit:** `feat(api): add FastAPI foundation, health check, settings, and tests`

**What changed**

* Added FastAPI application structure.
* Added app settings.
* Added `GET /health`.
* Added a backend health test.

**Why it mattered**

* Established the backend entrypoint.
* Verified the API can run and be tested.
* Satisfied the required health-check endpoint.

**Requirement coverage**

* FastAPI backend initialized.
* `GET /health` returns `{"status": "ok"}`.

**Verification**

* `pytest -q`

```mermaid
flowchart LR
  Client[Client] --> Health[GET /health]
  Health --> Response["{status: ok}"]
```

---

### 2. Patient database model and seed data

**Commit:** `feat(api): add patient database model and seed data`

**What changed**

* Added SQLAlchemy database setup.
* Added patient model.
* Added synthetic seed data.
* Added database seed tests.

**Why it mattered**

* Created the data foundation for the dashboard.
* Made the app capable of storing realistic patient records.
* Prepared the project for PostgreSQL in Docker.

**Requirement coverage**

* Patient schema.
* Realistic sample data.
* Re-creatable database foundation.

**Verification**

* `pytest -q`

```mermaid
erDiagram
  PATIENT {
    string id
    string first_name
    string last_name
    date date_of_birth
    string status
    string blood_type
    json conditions
    json allergies
    date last_visit_at
  }
```

---

### 3. Patient CRUD API

**Commit:** `feat(api): implement patient CRUD endpoints`

**What changed**

* Added Pydantic schemas for patient create, update, read, and paginated list responses.
* Added `/patients` CRUD routes backed by SQLAlchemy sessions.
* Added backend-owned pagination, search, status filtering, and sorting.
* Added API tests for list behavior, validation errors, not-found responses, and create/read/update/delete.

**Why it mattered**

* Established the main API contract the React app will consume.
* Kept scalable list behavior on the backend instead of forcing the browser to load every patient.
* Made server validation and error responses explicit before frontend forms depend on them.

**Requirement coverage**

* `GET /patients`
* `GET /patients/{id}`
* `POST /patients`
* `PUT /patients/{id}`
* `DELETE /patients/{id}`
* Appropriate status codes for create, delete, validation, and missing records.
* Backend tests for important patient API behavior.

**Verification**

* `cd backend`
* `source .venv/bin/activate 2>/dev/null || true`
* `python -m pytest -q`
* `python -m compileall -q app tests`

**Current architecture impact**

The backend now exposes a reviewer-facing patient API over the seeded database. The frontend can depend on paginated `items`, `total`, `page`, `page_size`, and `pages` metadata instead of inventing client-only list behavior.

```mermaid
sequenceDiagram
  participant Web as Future React Frontend
  participant API as FastAPI Patients Router
  participant DB as SQLAlchemy Database Session

  Web->>API: GET /patients?page=1&search=Ava&sort_by=name
  API->>DB: Filter, count, order, limit
  DB-->>API: Patients page + total count
  API-->>Web: PatientListResponse
```

---

### 4. React routing and API client foundation

**Commit:** `feat(web): initialize React app with routing and API client`

**What changed**

* Added a Vite React TypeScript frontend in `frontend/`.
* Added route placeholders for `/`, `/patients`, `/patients/:id`, `/patients/new`, `/patients/:id/edit`, and `*`.
* Added a typed API client for patient list, read, create, update, and delete calls.
* Added TanStack Query provider setup for server-state flows that will be built in later milestones.
* Added frontend lint and build scripts with a committed package lock.

**Why it mattered**

* Established the browser application entrypoint without coupling UI work to backend implementation details.
* Created a typed boundary for FastAPI responses before building list/detail/form screens.
* Verified the frontend can compile independently from the backend.

**Requirement coverage**

* React TypeScript frontend initialized.
* Required route surface created.
* Frontend API client can reach the required patient CRUD endpoints.

**Verification**

* `cd frontend`
* `npm run lint`
* `npm run build`

**Current architecture impact**

The repository is now a real full-stack monorepo: FastAPI owns patient data behavior, while React owns navigation and server-state consumption through a typed client layer.

```mermaid
flowchart LR
  Routes[React Router Routes] --> Pages[Route Page Components]
  Pages --> Query[TanStack Query Provider]
  Query --> Client[Typed API Client]
  Client --> API[FastAPI /patients API]
```

---

### 5. Responsive layout and patient directory

**Commit:** `feat(web): add responsive layout and patient list`

**What changed**

* Added the responsive header, sidebar, and main content shell.
* Replaced the patients placeholder with a backend-driven directory.
* Added URL-backed search, status filtering, sorting, page size, and pagination.
* Added non-blocking search input with deferred URL updates.
* Added loading, empty, error, and incremental fetching states for the directory.

**Why it mattered**

* Delivered the primary reviewer-visible workflow: finding and opening patient records.
* Kept search/filter/sort/pagination on the API boundary rather than duplicating it in browser state.
* Made the layout usable on desktop and lower-resolution screens before adding detail and form flows.

**Requirement coverage**

* Responsive layout with header, sidebar, and main area.
* Patient list showing name, age, last visit, and status.
* Search/filter functionality.
* Sorting.
* Pagination.
* Non-blocking search.
* Meaningful loading, empty, and error states.

**Verification**

* `cd frontend`
* `npm run lint`
* `npm run build`

**Current architecture impact**

The frontend now consumes the patient list endpoint as designed: URL params become typed API params, TanStack Query fetches the current page, and the UI renders list state without owning database-scale behavior.

```mermaid
flowchart TD
  Controls[Search Filter Sort Pagination Controls] --> URL[URL Query Params]
  URL --> QueryKey[TanStack Query Key]
  QueryKey --> Client[API Client listPatients]
  Client --> PatientsAPI[GET /patients]
  PatientsAPI --> Directory[Responsive Patient Table]
```

---

## Backend Request Flow

```mermaid
sequenceDiagram
  participant User
  participant Web as React Frontend
  participant API as FastAPI Backend
  participant DB as Database

  User->>Web: Search/filter patient list
  Web->>API: GET /patients?page=&search=&status=&sort_by=
  API->>DB: Query patients with pagination
  DB-->>API: Patients + total count
  API-->>Web: Paginated response
  Web-->>User: Patient list
```

## Data Model

```mermaid
erDiagram
  PATIENT ||--o{ NOTE : has
  PATIENT {
    string id
    string first_name
    string last_name
    date date_of_birth
    string status
    string blood_type
    json conditions
    json allergies
    date last_visit_at
  }
  NOTE {
    string id
    string patient_id
    string content
    datetime created_at
  }
```

## Design Decisions To Maintain

### Backend-owned pagination/filtering/sorting

The backend should own list operations instead of loading all patients into the browser. This keeps the frontend responsive as the dataset grows and demonstrates a more scalable API boundary.

### Deterministic summary instead of external LLM

The summary endpoint should be locally runnable without API keys. A deterministic summary avoids nondeterminism, hallucination risk, latency, and external dependency failures.

### TanStack Query for server state

Most frontend state in this app is server state: patients, notes, summaries, loading, errors, and refetching. TanStack Query is a better fit than Redux for this scope.

### Synthetic data only

All patient data must be fake and synthetic. No real patient data should be used or committed.

## 90-Second Interview Explanation

I built this as a small but production-minded patient management dashboard. The backend is FastAPI with a patient model, seeded synthetic data, CRUD endpoints, notes, and deterministic summaries. The frontend is React TypeScript with route-based screens for the dashboard, patient list, patient detail, and create/edit flows. I kept pagination, filtering, and sorting on the backend because that is the right boundary if the dataset grows. I also added an architecture timeline so the reviewer can see how the project evolved commit by commit and so I can explain the tradeoffs clearly in the next round.

## 5-Minute Interview Explanation

Start with the backend foundation: FastAPI, `/health`, config, tests.

Then explain the data model: patient records first, notes second, summary derived from patient and note data.

Then explain the API boundary: the frontend does not own business validation or list-scale behavior. The backend validates inputs, returns useful errors, and owns pagination/filtering/sorting.

Then explain the frontend: React TypeScript, routing, TanStack Query for server state, responsive dashboard layout, patient list, detail, forms, notes, and summary.

Then explain Docker: Docker Compose makes the reviewer experience simple by launching frontend, backend, and PostgreSQL together.

Then explain tradeoffs: deterministic summaries instead of external LLMs, no auth because not required, no overbuilt workflows, and synthetic data only.

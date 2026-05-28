# Assignment Reference — Ascertain Full Stack Take-Home

This document is the internal agent-facing reference for the Ascertain Forward Deployed Engineer full-stack take-home.

Do not treat this as filler documentation. Use it to keep implementation decisions aligned with what the assignment actually evaluates and what would stand out to an interviewer, reviewer, or future teammate.

## Original Assignment

The assignment is a **Healthcare Dashboard**.

Build a modern, scalable **React TypeScript** healthcare dashboard with a **FastAPI** backend and **PostgreSQL** database.

The context is a **patient management dashboard for a medical practice**. The app should be designed as if it can grow over time to include multiple user types, complex workflows, and real-time features.

The recommended time-box is 2–4 hours, so the project should prioritize high-signal engineering judgment over unnecessary complexity.

## Submission Requirements

The final submission must include:

* Public GitHub repo or zipped file
* Comprehensive but succinct `README.md`
* Instructions to run locally
* Functioning `docker-compose.yml`
* Backend API
* PostgreSQL database
* Frontend app

## Evaluation Criteria

The reviewer will assess:

1. Technical decision-making

   * architecture
   * library choices
   * state management
   * performance optimizations

2. Code quality

   * maintainable structure
   * best practices
   * clear naming
   * reasonable abstractions
   * no large tangled files

3. API design and error handling

   * predictable response shapes
   * meaningful error messages
   * appropriate HTTP status codes
   * server-side validation

4. Documentation and local setup

   * reviewer can run the project easily
   * README is truthful and concise
   * Docker Compose works

5. Correctness and completeness

   * required endpoints exist
   * required UI routes exist
   * core flows work

6. Requirement understanding

   * solution matches the healthcare dashboard prompt
   * decisions are justified
   * no irrelevant overbuilding

## Required Backend

Use FastAPI.

Required endpoint:

```http
GET /health
```

Expected response:

```json
{"status": "ok"}
```

Database:

* Use PostgreSQL for the final Dockerized setup.
* Store patients in a database schema.
* Ensure another developer can recreate the database using migrations, init scripts, or app startup table creation.
* Seed realistic synthetic sample data on startup.
* Minimum seed data: 15–20 patients.
* Stronger implementation: seed 100+ synthetic patients so pagination/search performance can actually be exercised.

Patient CRUD endpoints:

```http
GET    /patients
GET    /patients/{id}
POST   /patients
PUT    /patients/{id}
DELETE /patients/{id}
```

`GET /patients` must include pagination. Stronger implementation should also include:

* `page`
* `page_size`
* `search`
* `status`
* `sort_by`
* `sort_dir`

Patient notes endpoints:

```http
POST   /patients/{id}/notes
GET    /patients/{id}/notes
DELETE /patients/{id}/notes/{note_id}
```

Patient summary endpoint:

```http
GET /patients/{id}/summary
```

The summary can be deterministic. Do not require an external LLM API. Do not fake an LLM integration.

## Required Frontend

Use React TypeScript, preferably Vite.

Required pages/routes:

```text
/
 /patients
 /patients/:id
 /patients/new
 /patients/:id/edit
 *
```

Required UI structure:

* Header with navigation
* Sidebar
* Main content area
* Responsive layout for lower-resolution screens

Required patient list:

* Patient name
* Age
* Last visit
* Status
* Search/filter functionality
* Sorting
* Pagination or infinite scroll

Important list requirements:

* Must handle 100+ patients efficiently.
* Search should be non-blocking.
* Stronger implementation: backend-owned search/filter/sort/pagination instead of loading all patients and filtering locally.
* Stronger implementation: keep search/filter/page state in URL params where reasonable.

Required forms:

Patient create/edit form must include:

Personal information:

* name
* DOB
* contact
* address

Medical information:

* allergies
* conditions
* blood type
* status

Form behavior:

* client-side validation
* server-side validation
* meaningful user-facing errors
* network failure handling
* validation error handling

## Required Containerization

Package everything for easy local development.

Must include:

* Backend Dockerfile
* Frontend Dockerfile, or frontend served through backend if intentionally designed that way
* `docker-compose.yml`
* PostgreSQL service
* Backend API service
* Frontend service
* `.env.example` with required environment variables

Expected reviewer experience:

```bash
docker compose up --build
```

Then open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Docs:     http://localhost:8000/docs
Health:   http://localhost:8000/health
```

## Stretch Goals Worth Choosing

Only choose stretch goals if required work is green.

High-value stretch goals:

1. API unit tests
2. Status dashboard metrics
3. Patient status visualization
4. Advanced but simple filters
5. Hot reload in Docker if easy
6. CI config if time allows

Lower-priority stretch goals:

* E2E tests
* heavy charting
* virtualization
* complex auth
* real-time features
* external LLM integration

## What Will Stand Out Most

Optimize for reviewer confidence, not novelty.

The reviewer should think:

> This person can ship a working full-stack system, make good tradeoffs, explain their architecture, and avoid overengineering.

### 1. Docker works on the first try

This is one of the highest-signal parts.

A reviewer should be able to clone the repo and run:

```bash
docker compose up --build
```

If Docker fails, the rest of the project feels less trustworthy.

### 2. Backend-owned list behavior

Patient list search/filter/sort/pagination should call the backend.

This shows the candidate understands scalable API boundaries.

Bad:

* load all patients into frontend
* filter everything locally
* pagination only slices an already-loaded array

Good:

* backend receives query params
* backend validates sort fields
* backend returns total/page metadata
* frontend renders from server-state

### 3. Clear API errors

Use predictable errors.

Example:

```json
{
  "detail": {
    "code": "patient_not_found",
    "message": "Patient not found"
  }
}
```

This stands out because many candidates only return default framework errors.

### 4. Deterministic summary with evidence

Do not use a fake LLM wrapper.

Better:

* derive a useful patient summary from patient fields and recent notes
* include conditions/allergies/status/last visit
* include recent note snippets
* clearly avoid diagnostic overclaiming

This shows judgment: useful, local, deterministic, safe.

### 5. Human workflow thinking

This role is forward-deployed. The app should feel like something a practice manager or coordinator could actually use.

Add details like:

* needs review status
* clear missing/invalid field errors
* notes timeline
* last visit context
* summary panel
* status badges
* useful empty states

Do not add random features that do not support the workflow.

### 6. Architecture Timeline

Maintain:

```text
docs/ARCHITECTURE_TIMELINE.md
```

This should explain what changed commit by commit and why.

It helps the candidate explain the project in the next interview and helps reviewers see deliberate incremental engineering.

### 7. README reviewer path

The README should include a short path like:

1. Start Docker
2. Open dashboard
3. View patients
4. Search/filter/sort
5. Open patient detail
6. Add note
7. View summary
8. Create patient
9. Edit patient
10. Run tests

This reduces reviewer friction and directs them to the strongest parts.

## What Not To Do

Do not:

* commit `.env`
* commit `.venv`
* commit `node_modules`
* commit `dist`
* commit `dev.db`
* commit `.DS_Store`
* use real patient data
* add auth unless everything else is done
* add websockets
* add external LLM dependency
* add complex role systems
* add unnecessary microservices
* prioritize styling over working requirements
* leave Docker broken
* leave README commands untested
* make one giant commit
* squash the milestone commits

## Strong Technical Choices

Recommended backend:

* FastAPI
* SQLAlchemy 2.x
* Pydantic schemas
* PostgreSQL in Docker
* pytest for endpoint tests

Recommended frontend:

* Vite
* React
* TypeScript
* React Router
* TanStack Query
* React Hook Form + Zod if time allows
* simple CSS, not a heavy UI rabbit hole

Recommended state management explanation:

> TanStack Query handles server state: fetching, caching, loading, error, and refetching. Local React state handles UI state. Redux would be unnecessary complexity for this take-home.

Recommended summary explanation:

> The patient summary is deterministic instead of LLM-backed so the project is locally runnable, fast, testable, and does not require API keys or risk nondeterministic clinical output.

Recommended pagination explanation:

> Pagination/filtering/sorting live on the backend because the patient list is expected to scale beyond 100 records and should not depend on loading the full dataset into the browser.

## Final Agent Instruction

Every implementation decision should answer one of these questions:

1. Does this satisfy a stated assignment requirement?
2. Does this improve reviewer confidence?
3. Does this make the app easier to run, test, or understand?
4. Does this help the candidate explain the work in the next round?

If the answer is no, do not build it tonight.

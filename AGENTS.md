# AGENTS.md

# Ascertain Take-Home Agent Instructions

These instructions apply to all AI coding agents working in this repository.

## Assignment Reference

Before implementing any milestone, read:

```text
docs/ASSIGNMENT_REFERENCE.md

## Mission

Build a full-stack healthcare dashboard for the Ascertain Forward Deployed Engineer take-home.

The project must demonstrate:

* clean engineering judgment
* maintainable full-stack architecture
* correct API design and error handling
* responsive React TypeScript UI
* FastAPI backend
* PostgreSQL via Docker Compose
* succinct documentation and easy local setup
* realistic healthcare workflow thinking without overbuilding

## Hard Requirements From Assignment

The final project must include:

### Backend

* FastAPI application
* `GET /health` returning `{"status": "ok"}`
* PostgreSQL-backed patient storage
* reproducible database setup through migrations or init/create scripts
* realistic synthetic seed data, minimum 15–20 patients
* patient CRUD endpoints:

  * `GET /patients`
  * `GET /patients/{id}`
  * `POST /patients`
  * `PUT /patients/{id}`
  * `DELETE /patients/{id}`
* patient notes endpoints:

  * `POST /patients/{id}/notes`
  * `GET /patients/{id}/notes`
  * `DELETE /patients/{id}/notes/{note_id}`
* generated patient summary endpoint:

  * `GET /patients/{id}/summary`
* appropriate HTTP status codes
* useful API error messages
* backend tests for important behavior

### Frontend

* React TypeScript frontend, preferably Vite
* responsive layout with header, sidebar, and main content area
* routing:

  * `/`
  * `/patients`
  * `/patients/:id`
  * `/patients/new`
  * `/patients/:id/edit`
  * 404 page
* patient list showing:

  * name
  * age
  * last visit
  * status
* search/filter functionality
* sorting
* pagination or infinite scroll
* non-blocking search
* patient detail page
* notes UI
* generated summary UI
* create/edit patient forms
* client-side and server-side validation
* meaningful loading, empty, error, and not-found states

### DevOps / Documentation

* working `docker-compose.yml`
* frontend, backend, and PostgreSQL launchable from repo root
* `.env.example`
* succinct README with local setup instructions
* no secrets committed
* no `.venv`, `.env`, `node_modules`, `dist`, `.DS_Store`, `dev.db`, or generated junk committed

## Operating Principles

### 1. Think Before Coding

Before implementing each milestone:

* inspect the current repo
* identify what already exists
* state the specific files you expect to touch
* state the verification command
* do not silently reinterpret the task

If something is unclear or the repo is in a bad state, stop and report the blocker.

### 2. Simplicity First

Prefer the smallest reliable implementation that satisfies the assignment.

Do not add:

* authentication
* roles/permissions
* websockets
* queues
* external APIs
* fake LLM wrappers
* unnecessary abstractions
* unnecessary styling libraries
* speculative product features

The summary endpoint should be deterministic and locally runnable. Do not require API keys.

### 3. Surgical Changes

Touch only the files needed for the current milestone.

Do not rewrite unrelated code.
Do not reformat entire files unless necessary.
Do not rename folders casually.
Do not delete existing working code unless replacing it deliberately.

Every changed line should trace to the current milestone.

### 4. Verifiable Goals

Every milestone must have:

* implementation
* test/build verification
* commit
* architecture timeline update

Do not commit failing code.

### 5. Commit Discipline

Make one commit per milestone.

Do not squash.
Do not batch unrelated changes.
Do not commit partial broken work.
Do not commit generated dependency folders.
Do not commit local database files.

Before every commit run:

```bash
git status
```

Inspect staged files before committing:

```bash
git diff --staged --stat
git diff --staged
```

Use the exact commit messages listed in `docs/CODEX_OVERNIGHT_PLAN.md` unless a fix commit is required.

### 6. Architecture Timeline

After each commit, update:

```text
docs/ARCHITECTURE_TIMELINE.md
```

Each entry must include:

* commit message
* what changed
* why it mattered
* requirement coverage
* verification run
* current architecture impact

Include Mermaid diagrams for major phases.

This document should help the candidate explain the project in the next interview.

### 7. Fail Closed

If tests fail and the issue is not obvious, stop.

If Docker cannot be verified, document exactly what was verified and what remains unverified.

If frontend/backend integration breaks, stop and fix before moving on.

Do not continue piling features onto a broken foundation.

## Standard Verification Commands

Backend:

```bash
cd backend
source .venv/bin/activate 2>/dev/null || true
python -m pytest -q
python -m compileall -q app tests
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Docker:

```bash
docker compose config
docker compose up --build
```

If Docker is unavailable in the environment, run `docker compose config` and document that full container runtime verification must be performed locally.

## Final Quality Bar

Before final submission, the project should score at least 85/100:

* Requirements completeness: 30
* Backend/API quality: 20
* Frontend quality: 15
* Architecture/technical judgment: 15
* Local setup/docs: 10
* Differentiation: 10

Automatic failure conditions:

* Docker Compose does not work locally
* README setup is wrong
* required endpoints are missing
* frontend cannot reach backend
* app crashes on fresh database
* `.env`, `.venv`, `node_modules`, or database files are committed
* generated summary is hardcoded nonsense
* patient list search/filter/sort/pagination is fake or broken

#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "== 1. Git status =="
git status --short

echo ""
echo "== 2. Backend tests =="
cd backend

if [ ! -d ".venv" ]; then
  echo "Creating backend virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install -q -r requirements.txt
python -m pytest -q
python -m compileall -q app tests
deactivate || true
cd ..

echo ""
echo "== 3. Frontend checks =="
cd frontend
npm install
npm run lint
npm run build
cd ..

echo ""
echo "== 4. Docker daemon check =="
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Opening Docker Desktop..."
  open -a Docker || true

  echo "Waiting for Docker daemon..."
  for i in {1..60}; do
    if docker info >/dev/null 2>&1; then
      echo "Docker is running."
      break
    fi

    if [ "$i" -eq 60 ]; then
      echo "Docker did not start within 120 seconds."
      echo "Open Docker Desktop manually, wait until it is running, then rerun: make preflight"
      exit 1
    fi

    sleep 2
  done
fi

echo ""
echo "== 5. Docker Compose validation =="
docker compose config >/dev/null

echo ""
echo "== 6. Rebuild and start app =="
docker compose down -v --remove-orphans
docker compose up --build -d

echo ""
echo "== 7. Container status =="
docker compose ps

echo ""
echo "== 8. Wait for backend health =="
for i in {1..30}; do
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    echo "Backend health check passed."
    break
  fi

  if [ "$i" -eq 30 ]; then
    echo "Backend did not become healthy."
    docker compose logs backend --tail=100
    exit 1
  fi

  sleep 2
done

echo ""
echo "== 9. API smoke tests =="
python3 <<'PY'
import json
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def request(method: str, path: str, data: dict | None = None):
    body = None
    headers = {"Content-Type": "application/json"}

    if data is not None:
        body = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw) if raw else None
            return response.status, parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        parsed = json.loads(raw) if raw else raw
        raise AssertionError(f"{method} {path} failed: {exc.code} {parsed}") from exc


status, health = request("GET", "/health")
assert status == 200, status
assert health == {"status": "ok"}, health

status, patients = request("GET", "/patients?page=1&page_size=5")
assert status == 200, status
assert "items" in patients, patients
assert "total" in patients, patients
assert len(patients["items"]) > 0, patients

status, filtered = request(
    "GET",
    "/patients?page=1&page_size=5&search=noah&status=needs_review&sort_by=name&sort_dir=asc",
)
assert status == 200, status
assert "items" in filtered, filtered

new_patient = {
    "first_name": "Preflight",
    "last_name": "Tester",
    "date_of_birth": "1990-01-15",
    "phone": "555-0100",
    "email": "preflight.tester@example.com",
    "address_line_1": "123 Test Way",
    "city": "St. Petersburg",
    "state": "FL",
    "zip_code": "33701",
    "blood_type": "O+",
    "status": "active",
    "conditions": ["Hypertension", "Asthma"],
    "allergies": ["Penicillin", "Latex"],
    "last_visit_at": "2026-05-01",
}

status, created = request("POST", "/patients", new_patient)
assert status in (200, 201), status
patient_id = created["id"]

status, fetched = request("GET", f"/patients/{patient_id}")
assert status == 200, status
assert fetched["first_name"] == "Preflight", fetched
assert fetched["status"] == "active", fetched

updated_patient = dict(new_patient)
updated_patient["status"] = "needs_review"
updated_patient["last_visit_at"] = "2026-05-15"

status, updated = request("PUT", f"/patients/{patient_id}", updated_patient)
assert status == 200, status
assert updated["status"] == "needs_review", updated

note_payload = {
    "content": "Preflight note: patient reports improved symptoms after medication review."
}

status, note = request("POST", f"/patients/{patient_id}/notes", note_payload)
assert status in (200, 201), status
assert "id" in note, note

status, notes = request("GET", f"/patients/{patient_id}/notes")
assert status == 200, status
assert len(notes) >= 1, notes

status, summary = request("GET", f"/patients/{patient_id}/summary")
assert status == 200, status
assert summary, summary
summary_text = json.dumps(summary).lower()
assert "preflight" in summary_text or "hypertension" in summary_text or "asthma" in summary_text, summary

status, deleted = request("DELETE", f"/patients/{patient_id}")
assert status in (200, 204), status

print("API smoke tests passed.")
PY

echo ""
echo "== 10. Frontend smoke check =="
curl -fsS http://localhost:5173 >/dev/null
echo "Frontend responded at http://localhost:5173"

echo ""
echo "== 11. Recent backend logs =="
docker compose logs backend --tail=40

echo ""
echo "PRE-FLIGHT PASSED"
echo ""
echo "Manual browser check still recommended:"
echo "1. Open http://localhost:5173"
echo "2. Confirm patient list loads"
echo "3. Create/edit a patient"
echo "4. Add a note"
echo "5. View summary"
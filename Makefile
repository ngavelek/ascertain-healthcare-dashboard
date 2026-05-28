.PHONY: setup-backend setup-frontend test-backend build-frontend lint-frontend verify preflight

setup-backend:
	cd backend && python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt

setup-frontend:
	cd frontend && npm install

test-backend:
	cd backend && .venv/bin/python -m pytest -q && .venv/bin/python -m compileall -q app tests

build-frontend:
	cd frontend && npm run build

lint-frontend:
	cd frontend && npm run lint

verify: test-backend build-frontend lint-frontend
	docker compose config

preflight:
	./scripts/preflight.sh
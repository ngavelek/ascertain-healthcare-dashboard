.PHONY: test-backend build-frontend lint-frontend verify

test-backend:
	cd backend && source .venv/bin/activate && python -m pytest -q && python -m compileall -q app tests

build-frontend:
	cd frontend && npm run build

lint-frontend:
	cd frontend && npm run lint

verify: test-backend build-frontend lint-frontend
	docker compose config
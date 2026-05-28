import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.db import Base, SessionLocal, engine
from app import models  # noqa: F401 --> forces Python to load models.py, so SQLAlchemy knows the Patient table exists before it tries to create tables.
from app.routers.patients import router as patients_router
from app.seed import seed_patients

logging.basicConfig(level=logging.INFO)
request_logger = logging.getLogger("app.requests")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            seed_patients(db, target_count=settings.seed_count)
        finally:
            db.close()

    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request_metadata(request: Request, call_next) -> Response:
    started_at = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration_ms = (time.perf_counter() - started_at) * 1000
        request_logger.info(
            "%s %s %s %.2fms",
            request.method,
            request.url.path,
            status_code,
            duration_ms,
        )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(patients_router)

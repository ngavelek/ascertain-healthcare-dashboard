from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import Base, SessionLocal, engine
from app import models  # noqa: F401 --> forces Python to load models.py, so SQLAlchemy knows the Patient table exists before it tries to create tables.
from app.routers.patients import router as patients_router
from app.seed import seed_patients


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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(patients_router)

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app.models import Base
from app.routers import meal_plans, recipes
from app.seed import seed_demo_data

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads" / "recipes"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Cheffify API",
        description="Meal planning, grocery aggregation, and recipe management service.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
    app.include_router(meal_plans.router, prefix="/api/meal-plans", tags=["meal-plans"])

    app.mount(
        "/uploads",
        StaticFiles(directory=str(Path(__file__).resolve().parent.parent / "uploads")),
        name="uploads",
    )

    @app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok", "app": "Cheffify"}

    return app


app = create_app()

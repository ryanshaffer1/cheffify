from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import engine
from app.models import Base
from app.routers import meal_plans, recipes
from app.seed import seed_demo_data


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

    @app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok", "app": "Cheffify"}

    return app


app = create_app()

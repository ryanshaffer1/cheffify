from fastapi import FastAPI

from app.routers import meal_plans, recipes

app = FastAPI(
    title="Cheffify API",
    description="Meal planning, grocery aggregation, and recipe management service.",
    version="0.1.0",
)

app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(meal_plans.router, prefix="/api/meal-plans", tags=["meal-plans"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "Cheffify"}

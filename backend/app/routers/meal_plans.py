from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    GroceryList,
    GroceryListItem,
    MealPlan,
    MealPlanRecipe,
    Recipe,
    RecipeIngredient,
    User,
)
from app.schemas import MealPlanCreate

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_meal_plans(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    plans = db.query(MealPlan).all()
    return [{"id": plan.id, "name": plan.name} for plan in plans]


@router.post("", response_model=dict[str, object], status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    payload: MealPlanCreate, db: Session = Depends(get_db)
) -> dict[str, object]:
    user = db.query(User).first()
    if user is None:
        user = User(email="demo@cheffify.app", full_name="Demo User")
        db.add(user)
        db.flush()

    plan = MealPlan(user_id=user.id, name=f"Meal Plan {db.query(MealPlan).count() + 1}")
    db.add(plan)
    db.flush()

    seen_recipe_ids: set[int] = set()
    for recipe_id in payload.recipe_ids:
        if recipe_id in seen_recipe_ids:
            continue
        seen_recipe_ids.add(recipe_id)

        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if recipe is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recipe {recipe_id} not found",
            )

        servings = payload.servings_by_recipe.get(recipe_id, recipe.default_servings)
        db.add(
            MealPlanRecipe(meal_plan_id=plan.id, recipe_id=recipe.id, servings=servings)
        )

    db.commit()

    grocery_items = generate_grocery_items(plan.id, db)
    return {"id": plan.id, "name": plan.name, "grocery_items": grocery_items}


@router.get("/{meal_plan_id}/grocery")
def get_meal_plan_grocery(
    meal_plan_id: int, db: Session = Depends(get_db)
) -> list[dict[str, object]]:
    plan = db.query(MealPlan).filter(MealPlan.id == meal_plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
        )

    return generate_grocery_items(plan.id, db)


def generate_grocery_items(meal_plan_id: int, db: Session) -> list[dict[str, object]]:
    links = (
        db.query(MealPlanRecipe)
        .filter(MealPlanRecipe.meal_plan_id == meal_plan_id)
        .all()
    )
    grouped: dict[tuple[str, str | None], dict[str, object]] = {}

    for link in links:
        recipe = db.query(Recipe).filter(Recipe.id == link.recipe_id).first()
        if recipe is None:
            continue

        scale_factor = (
            link.servings / recipe.default_servings if recipe.default_servings else 1
        )
        for ingredient in recipe.ingredients:
            key = (ingredient.normalized_name, ingredient.unit)
            if key not in grouped:
                grouped[key] = {
                    "display_name": ingredient.display_name,
                    "normalized_name": ingredient.normalized_name,
                    "quantity": 0.0,
                    "unit": ingredient.unit,
                    "source_recipe_names": set(),
                }

            total_quantity = float(ingredient.quantity) * scale_factor
            grouped[key]["quantity"] = float(grouped[key]["quantity"]) + total_quantity
            grouped[key]["source_recipe_names"].add(recipe.title)

    return [
        {
            "display_name": data["display_name"],
            "normalized_name": data["normalized_name"],
            "quantity": round(float(data["quantity"]), 2),
            "unit": data["unit"],
            "source_recipe_names": sorted(data["source_recipe_names"]),
        }
        for data in grouped.values()
    ]

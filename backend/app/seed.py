from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Recipe,
    RecipeIngredient,
    RecipeInstruction,
    RecipeKeyword,
    RecipeNutrition,
    User,
)


def seed_demo_data() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        user = User(email="demo@cheffify.app", full_name="Demo User")
        db.add(user)
        db.flush()

        recipe = Recipe(
            title="Sheet Pan Chicken & Veggies",
            description="A simple one-pan dinner.",
            default_servings=2,
            servings_min=1,
            servings_max=4,
            image_url="https://images.example.com/chicken-pan.jpg",
            source_type="custom",
            created_by=user.id,
        )
        db.add(recipe)
        db.flush()

        db.add_all(
            [
                RecipeKeyword(recipe_id=recipe.id, keyword="quick"),
                RecipeKeyword(recipe_id=recipe.id, keyword="dinner"),
                RecipeKeyword(recipe_id=recipe.id, keyword="sheet pan"),
                RecipeIngredient(
                    recipe_id=recipe.id,
                    display_name="Chicken breast",
                    normalized_name="chicken breast",
                    quantity=2,
                    unit="pieces",
                    sort_order=1,
                ),
                RecipeIngredient(
                    recipe_id=recipe.id,
                    display_name="Broccoli",
                    normalized_name="broccoli",
                    quantity=2,
                    unit="cups",
                    sort_order=2,
                ),
                RecipeIngredient(
                    recipe_id=recipe.id,
                    display_name="Tomatoes",
                    normalized_name="tomatoes",
                    quantity=1,
                    unit="cup",
                    sort_order=3,
                ),
                RecipeInstruction(
                    recipe_id=recipe.id,
                    step_number=1,
                    instruction="Preheat oven to 425F.",
                ),
                RecipeInstruction(
                    recipe_id=recipe.id,
                    step_number=2,
                    instruction="Place vegetables and chicken on a sheet pan.",
                ),
                RecipeInstruction(
                    recipe_id=recipe.id,
                    step_number=3,
                    instruction="Roast until cooked through and lightly browned.",
                ),
            ]
        )

        db.add(
            RecipeNutrition(
                recipe_id=recipe.id,
                calories=540,
                protein_g=42,
                carbs_g=18,
                fat_g=25,
                fiber_g=6,
                notes="Estimated per full recipe.",
            )
        )

        db.commit()
    finally:
        db.close()

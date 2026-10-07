import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.recipe_parsing import (
    extract_text_from_file,
    merge_text_with_overlap,
    parse_recipe,
)
from app.models import (
    Recipe,
    RecipeIngredient,
    RecipeInstruction,
    RecipeKeyword,
    RecipeNutrition,
    RecipeTool,
)
from app.schemas import ImportedRecipeRead, RecipeCreate, RecipeRead

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "recipes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/upload-image")
def upload_recipe_image(file: UploadFile = File(...)) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided"
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type"
        )

    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / filename
    contents = file.file.read()
    destination.write_bytes(contents)

    return {"image_url": f"/uploads/recipes/{filename}"}


@router.post("/import", response_model=dict[str, object])
def import_recipe_text(
    file: UploadFile | None = None,
    files: list[UploadFile] | None = None,
) -> dict[str, object]:
    uploaded_files = files if files else ([file] if file else [])
    if not uploaded_files or any(
        not uploaded_file.filename for uploaded_file in uploaded_files
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided"
        )

    extracted_pages = []
    for uploaded_file in uploaded_files:
        suffix = Path(uploaded_file.filename or "").suffix.lower()
        filename = f"{uuid.uuid4().hex}{suffix}"
        destination = UPLOAD_DIR / filename
        destination.write_bytes(uploaded_file.file.read())
        extracted_pages.append(extract_text_from_file(destination))

    extracted_text = merge_text_with_overlap(extracted_pages)
    parsed_recipe = parse_recipe(extracted_text)

    return {
        "text": extracted_text,
        "recipe": ImportedRecipeRead.model_validate(parsed_recipe).model_dump(),
    }


@router.get("", response_model=list[RecipeRead])
def list_recipes(db: Session = Depends(get_db)) -> list[RecipeRead]:
    recipes = db.query(Recipe).all()
    result = []
    for recipe in recipes:
        result.append(
            RecipeRead(
                id=recipe.id,
                title=recipe.title,
                description=recipe.description,
                default_servings=recipe.default_servings,
                servings_min=recipe.servings_min,
                servings_max=recipe.servings_max,
                image_url=recipe.image_url,
                source_type=recipe.source_type,
                keywords=[k.keyword for k in recipe.keywords],
                tools=[t.name for t in recipe.tools],
                ingredients=[
                    {
                        "display_name": i.display_name,
                        "normalized_name": i.normalized_name,
                        "quantity": float(i.quantity),
                        "unit": i.unit,
                        "is_optional": i.is_optional,
                        "notes": i.notes,
                    }
                    for i in recipe.ingredients
                ],
                instructions=[
                    {"step_number": step.step_number, "instruction": step.instruction}
                    for step in recipe.instructions
                ],
                nutrition=(
                    {
                        "calories": float(recipe.nutrition.calories)
                        if recipe.nutrition and recipe.nutrition.calories is not None
                        else None,
                        "protein_g": float(recipe.nutrition.protein_g)
                        if recipe.nutrition and recipe.nutrition.protein_g is not None
                        else None,
                        "carbs_g": float(recipe.nutrition.carbs_g)
                        if recipe.nutrition and recipe.nutrition.carbs_g is not None
                        else None,
                        "fat_g": float(recipe.nutrition.fat_g)
                        if recipe.nutrition and recipe.nutrition.fat_g is not None
                        else None,
                        "fiber_g": float(recipe.nutrition.fiber_g)
                        if recipe.nutrition and recipe.nutrition.fiber_g is not None
                        else None,
                        "notes": recipe.nutrition.notes if recipe.nutrition else None,
                    }
                    if recipe.nutrition
                    else None
                ),
            )
        )
    return result


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    return RecipeRead(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        default_servings=recipe.default_servings,
        servings_min=recipe.servings_min,
        servings_max=recipe.servings_max,
        image_url=recipe.image_url,
        source_type=recipe.source_type,
        keywords=[k.keyword for k in recipe.keywords],
        tools=[t.name for t in recipe.tools],
        ingredients=[
            {
                "display_name": i.display_name,
                "normalized_name": i.normalized_name,
                "quantity": float(i.quantity),
                "unit": i.unit,
                "is_optional": i.is_optional,
                "notes": i.notes,
            }
            for i in recipe.ingredients
        ],
        instructions=[
            {"step_number": step.step_number, "instruction": step.instruction}
            for step in recipe.instructions
        ],
        nutrition=(
            {
                "calories": float(recipe.nutrition.calories)
                if recipe.nutrition and recipe.nutrition.calories is not None
                else None,
                "protein_g": float(recipe.nutrition.protein_g)
                if recipe.nutrition and recipe.nutrition.protein_g is not None
                else None,
                "carbs_g": float(recipe.nutrition.carbs_g)
                if recipe.nutrition and recipe.nutrition.carbs_g is not None
                else None,
                "fat_g": float(recipe.nutrition.fat_g)
                if recipe.nutrition and recipe.nutrition.fat_g is not None
                else None,
                "fiber_g": float(recipe.nutrition.fiber_g)
                if recipe.nutrition and recipe.nutrition.fiber_g is not None
                else None,
                "notes": recipe.nutrition.notes if recipe.nutrition else None,
            }
            if recipe.nutrition
            else None
        ),
    )


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe(payload: RecipeCreate, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = Recipe(
        title=payload.title,
        description=payload.description,
        default_servings=payload.default_servings,
        servings_min=payload.servings_min,
        servings_max=payload.servings_max,
        image_url=payload.image_url,
        source_type=payload.source_type,
        created_by=1,
    )
    db.add(recipe)
    db.flush()

    for keyword in payload.keywords:
        db.add(RecipeKeyword(recipe_id=recipe.id, keyword=keyword))

    for tool_name in payload.tools:
        db.add(RecipeTool(recipe_id=recipe.id, name=tool_name))

    for ingredient in payload.ingredients:
        db.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                display_name=ingredient.display_name,
                normalized_name=ingredient.normalized_name,
                quantity=ingredient.quantity,
                unit=ingredient.unit,
                is_optional=ingredient.is_optional,
                notes=ingredient.notes,
                sort_order=0,
            )
        )

    for instruction in payload.instructions:
        db.add(
            RecipeInstruction(
                recipe_id=recipe.id,
                step_number=instruction.step_number,
                instruction=instruction.instruction,
            )
        )

    if payload.nutrition:
        db.add(
            RecipeNutrition(
                recipe_id=recipe.id,
                calories=payload.nutrition.calories,
                protein_g=payload.nutrition.protein_g,
                carbs_g=payload.nutrition.carbs_g,
                fat_g=payload.nutrition.fat_g,
                fiber_g=payload.nutrition.fiber_g,
                notes=payload.nutrition.notes,
            )
        )

    db.commit()
    db.refresh(recipe)
    return get_recipe(recipe.id, db)


@router.put("/{recipe_id}", response_model=RecipeRead)
def update_recipe(
    recipe_id: int, payload: RecipeCreate, db: Session = Depends(get_db)
) -> RecipeRead:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    recipe.title = payload.title
    recipe.description = payload.description
    recipe.default_servings = payload.default_servings
    recipe.servings_min = payload.servings_min
    recipe.servings_max = payload.servings_max
    recipe.image_url = payload.image_url
    recipe.source_type = payload.source_type

    db.query(RecipeKeyword).filter(RecipeKeyword.recipe_id == recipe.id).delete()
    db.query(RecipeTool).filter(RecipeTool.recipe_id == recipe.id).delete()
    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).delete()
    db.query(RecipeInstruction).filter(
        RecipeInstruction.recipe_id == recipe.id
    ).delete()
    if recipe.nutrition:
        db.query(RecipeNutrition).filter(
            RecipeNutrition.recipe_id == recipe.id
        ).delete()

    for keyword in payload.keywords:
        db.add(RecipeKeyword(recipe_id=recipe.id, keyword=keyword))

    for tool_name in payload.tools:
        db.add(RecipeTool(recipe_id=recipe.id, name=tool_name))

    seen_ingredients: set[tuple[str, str, int]] = set()
    for index, ingredient in enumerate(payload.ingredients):
        normalized_name = (
            ingredient.normalized_name or ingredient.display_name or ""
        ).strip()
        unit_value = (ingredient.unit or "").strip().lower()
        ingredient_key = (normalized_name.lower(), unit_value, index)
        if ingredient_key in seen_ingredients:
            continue
        seen_ingredients.add(ingredient_key)

        db.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                display_name=ingredient.display_name,
                normalized_name=normalized_name,
                quantity=ingredient.quantity,
                unit=ingredient.unit,
                is_optional=ingredient.is_optional,
                notes=ingredient.notes,
                sort_order=index,
            )
        )

    for instruction in payload.instructions:
        db.add(
            RecipeInstruction(
                recipe_id=recipe.id,
                step_number=instruction.step_number,
                instruction=instruction.instruction,
            )
        )

    if payload.nutrition:
        db.add(
            RecipeNutrition(
                recipe_id=recipe.id,
                calories=payload.nutrition.calories,
                protein_g=payload.nutrition.protein_g,
                carbs_g=payload.nutrition.carbs_g,
                fat_g=payload.nutrition.fat_g,
                fiber_g=payload.nutrition.fiber_g,
                notes=payload.nutrition.notes,
            )
        )

    db.commit()
    return get_recipe(recipe.id, db)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)) -> None:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    db.delete(recipe)
    db.commit()

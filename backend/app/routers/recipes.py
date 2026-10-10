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


def _recipe_to_read(recipe: Recipe) -> RecipeRead:
    ingredients = [
        {
            "id": ingredient.id,
            "display_name": ingredient.display_name,
            "normalized_name": ingredient.normalized_name,
            "quantity": float(ingredient.quantity),
            "unit": ingredient.unit,
            "is_optional": ingredient.is_optional,
            "notes": ingredient.notes,
        }
        for ingredient in sorted(recipe.ingredients, key=lambda item: item.sort_order)
    ]
    instructions = [
        {
            "step_number": step.step_number,
            "instruction": step.instruction,
            "ingredient_ids": [
                ingredient.id
                for ingredient in sorted(
                    step.ingredients, key=lambda item: item.sort_order
                )
            ],
            "ingredient_names": [],
        }
        for step in sorted(recipe.instructions, key=lambda item: item.step_number)
    ]
    return RecipeRead(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        default_servings=recipe.default_servings,
        servings_min=recipe.servings_min,
        servings_max=recipe.servings_max,
        image_url=recipe.image_url,
        source=recipe.source,
        source_type=recipe.source_type,
        keywords=[keyword.keyword for keyword in recipe.keywords],
        tools=[tool.name for tool in recipe.tools],
        ingredients=ingredients,
        instructions=instructions,
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
    return [_recipe_to_read(recipe) for recipe in recipes]


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    return _recipe_to_read(recipe)


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe(payload: RecipeCreate, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = Recipe(
        title=payload.title,
        description=payload.description,
        default_servings=payload.default_servings,
        servings_min=payload.servings_min,
        servings_max=payload.servings_max,
        image_url=payload.image_url,
        source=payload.source,
        source_type=payload.source_type,
        created_by=1,
    )
    db.add(recipe)
    db.flush()

    for keyword in payload.keywords:
        db.add(RecipeKeyword(recipe_id=recipe.id, keyword=keyword))

    for tool_name in payload.tools:
        db.add(RecipeTool(recipe_id=recipe.id, name=tool_name))

    persisted_ingredients: list[RecipeIngredient] = []
    for ingredient in payload.ingredients:
        persisted_ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            display_name=ingredient.display_name,
            normalized_name=ingredient.normalized_name,
            quantity=ingredient.quantity,
            unit=ingredient.unit,
            is_optional=ingredient.is_optional,
            notes=ingredient.notes,
            sort_order=0,
        )
        db.add(persisted_ingredient)
        persisted_ingredients.append(persisted_ingredient)
    db.flush()

    ingredient_by_name = {
        ingredient.normalized_name.casefold(): ingredient
        for ingredient in persisted_ingredients
    }
    for instruction in payload.instructions:
        persisted_instruction = RecipeInstruction(
            recipe_id=recipe.id,
            step_number=instruction.step_number,
            instruction=instruction.instruction,
        )
        db.add(persisted_instruction)
        db.flush()
        for ingredient_name in instruction.ingredient_names:
            ingredient = ingredient_by_name.get(ingredient_name.casefold())
            if ingredient is not None:
                persisted_instruction.ingredients.append(ingredient)

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
    recipe.source = payload.source
    recipe.source_type = payload.source_type

    for existing_keyword in list(recipe.keywords):
        db.delete(existing_keyword)
    for existing_tool in list(recipe.tools):
        db.delete(existing_tool)
    if recipe.nutrition:
        db.delete(recipe.nutrition)
    db.flush()

    for keyword in payload.keywords:
        recipe.keywords.append(RecipeKeyword(keyword=keyword))

    for tool_name in payload.tools:
        recipe.tools.append(RecipeTool(name=tool_name))

    existing_ingredients = {
        ingredient.id: ingredient for ingredient in recipe.ingredients
    }
    existing_ingredients_by_name = {
        (
            ingredient.normalized_name.casefold(),
            (ingredient.unit or "").strip().lower(),
        ): ingredient
        for ingredient in existing_ingredients.values()
    }
    persisted_ingredients: list[RecipeIngredient] = []
    requested_ingredient_ids: set[int] = set()

    for index, ingredient in enumerate(payload.ingredients):
        normalized_name = (
            ingredient.normalized_name or ingredient.display_name or ""
        ).strip()
        unit_value = (ingredient.unit or "").strip().lower()
        persisted_ingredient = None

        if ingredient.id is not None:
            persisted_ingredient = existing_ingredients.get(ingredient.id)
            if persisted_ingredient is None:
                persisted_ingredient = RecipeIngredient(
                    recipe_id=recipe.id,
                    display_name=ingredient.display_name,
                    normalized_name=normalized_name,
                    quantity=ingredient.quantity,
                    unit=ingredient.unit,
                    is_optional=ingredient.is_optional,
                    notes=ingredient.notes,
                    sort_order=index,
                )
                db.add(persisted_ingredient)
        else:
            persisted_ingredient = existing_ingredients_by_name.get(
                (normalized_name.casefold(), unit_value)
            )
            if persisted_ingredient is None:
                persisted_ingredient = RecipeIngredient(
                    recipe_id=recipe.id,
                    display_name=ingredient.display_name,
                    normalized_name=normalized_name,
                    quantity=ingredient.quantity,
                    unit=ingredient.unit,
                    is_optional=ingredient.is_optional,
                    notes=ingredient.notes,
                    sort_order=index,
                )
                db.add(persisted_ingredient)

        persisted_ingredient.display_name = ingredient.display_name
        persisted_ingredient.normalized_name = normalized_name
        persisted_ingredient.quantity = ingredient.quantity
        persisted_ingredient.unit = ingredient.unit
        persisted_ingredient.is_optional = ingredient.is_optional
        persisted_ingredient.notes = ingredient.notes
        persisted_ingredient.sort_order = index
        persisted_ingredients.append(persisted_ingredient)
        requested_ingredient_ids.add(persisted_ingredient.id)

    db.flush()

    existing_instructions = sorted(
        recipe.instructions, key=lambda item: item.step_number
    )
    for existing_instruction in existing_instructions:
        existing_instruction.ingredients.clear()
    for existing_instruction in existing_instructions[len(payload.instructions) :]:
        db.delete(existing_instruction)

    ingredient_by_id = {
        ingredient.id: ingredient for ingredient in persisted_ingredients
    }
    ingredient_by_name = {
        ingredient.normalized_name.casefold(): ingredient
        for ingredient in persisted_ingredients
    }
    for index, instruction in enumerate(payload.instructions):
        persisted_instruction = (
            existing_instructions[index]
            if index < len(existing_instructions)
            else RecipeInstruction(
                recipe_id=recipe.id,
                step_number=instruction.step_number,
                instruction=instruction.instruction,
            )
        )
        if persisted_instruction.recipe_id is None:
            recipe.instructions.append(persisted_instruction)
        persisted_instruction.instruction = instruction.instruction
        persisted_instruction.step_number = instruction.step_number

        linked_ingredient_ids = set(instruction.ingredient_ids)
        for ingredient_name in instruction.ingredient_names:
            ingredient = ingredient_by_name.get(ingredient_name.casefold())
            if ingredient is not None:
                linked_ingredient_ids.add(ingredient.id)
        for ingredient_id in linked_ingredient_ids:
            ingredient = ingredient_by_id.get(ingredient_id)
            if ingredient is not None:
                persisted_instruction.ingredients.append(ingredient)

    for existing_ingredient in list(recipe.ingredients):
        if existing_ingredient.id not in requested_ingredient_ids:
            db.delete(existing_ingredient)

    db.flush()

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
    db.expire(recipe, attribute_names=["instructions", "ingredients"])
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

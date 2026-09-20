from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_recipes() -> dict[str, str]:
    return {"message": "list recipes"}


@router.get("/{recipe_id}")
def get_recipe(recipe_id: int) -> dict[str, int | str]:
    return {"id": recipe_id, "title": "Example recipe"}

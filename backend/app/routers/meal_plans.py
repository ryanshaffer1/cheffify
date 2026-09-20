from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_meal_plans() -> dict[str, str]:
    return {"message": "list meal plans"}


@router.post("")
def create_meal_plan() -> dict[str, str]:
    return {"message": "meal plan created"}

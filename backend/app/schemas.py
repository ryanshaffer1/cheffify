from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class NutritionBase(BaseModel):
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = None
    notes: str | None = None


class IngredientBase(BaseModel):
    display_name: str
    normalized_name: str
    quantity: float
    unit: str | None = None
    is_optional: bool = False
    notes: str | None = None


class InstructionBase(BaseModel):
    step_number: int
    instruction: str


class RecipeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    default_servings: int = Field(..., gt=0)
    servings_min: int | None = Field(default=None, gt=0)
    servings_max: int | None = Field(default=None, gt=0)
    image_url: str | None = None
    source_type: Literal["built_in", "custom"] = "custom"
    keywords: list[str] = []
    tools: list[str] = []
    ingredients: list[IngredientBase] = []
    instructions: list[InstructionBase] = []
    nutrition: NutritionBase | None = None


class RecipeRead(RecipeCreate):
    id: int


class MealPlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    recipe_ids: list[int] = []
    servings_by_recipe: dict[int, int] = {}


class GroceryItemRead(BaseModel):
    id: int
    display_name: str
    normalized_name: str
    quantity: float
    unit: str | None = None
    checked_off: bool = False
    source_type: str
    source_recipe_name: str | None = None

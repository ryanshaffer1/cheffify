from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)

    recipes = relationship("Recipe", back_populates="owner")
    meal_plans = relationship("MealPlan", back_populates="owner")
    grocery_lists = relationship("GroceryList", back_populates="owner")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_servings = Column(Integer, nullable=False)
    servings_min = Column(Integer, nullable=True)
    servings_max = Column(Integer, nullable=True)
    image_url = Column(Text, nullable=True)
    source_type = Column(String(32), nullable=False, default="custom")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    tools = relationship("RecipeTool", back_populates="recipe", cascade="all, delete-orphan")
    instructions = relationship("RecipeInstruction", back_populates="recipe", cascade="all, delete-orphan")
    nutrition = relationship("RecipeNutrition", back_populates="recipe", uselist=False, cascade="all, delete-orphan")
    keywords = relationship("RecipeKeyword", back_populates="recipe", cascade="all, delete-orphan")


class RecipeKeyword(Base):
    __tablename__ = "recipe_keywords"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    keyword = Column(String(100), nullable=False)

    recipe = relationship("Recipe", back_populates="keywords")

    __table_args__ = (UniqueConstraint("recipe_id", "keyword"),)


class RecipeTool(Base):
    __tablename__ = "recipe_tools"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    name = Column(String(120), nullable=False)

    recipe = relationship("Recipe", back_populates="tools")

    __table_args__ = (UniqueConstraint("recipe_id", "name"),)


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    display_name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=0)
    unit = Column(String(50), nullable=True)
    is_optional = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    recipe = relationship("Recipe", back_populates="ingredients")

    __table_args__ = (UniqueConstraint("recipe_id", "normalized_name", "unit", "sort_order"),)


class RecipeInstruction(Base):
    __tablename__ = "recipe_instructions"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    instruction = Column(Text, nullable=False)

    recipe = relationship("Recipe", back_populates="instructions")

    __table_args__ = (UniqueConstraint("recipe_id", "step_number"),)


class RecipeNutrition(Base):
    __tablename__ = "recipe_nutrition"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False, unique=True)
    calories = Column(Numeric(8, 2), nullable=True)
    protein_g = Column(Numeric(8, 2), nullable=True)
    carbs_g = Column(Numeric(8, 2), nullable=True)
    fat_g = Column(Numeric(8, 2), nullable=True)
    fiber_g = Column(Numeric(8, 2), nullable=True)
    notes = Column(Text, nullable=True)

    recipe = relationship("Recipe", back_populates="nutrition")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)

    owner = relationship("User", back_populates="meal_plans")
    recipe_links = relationship("MealPlanRecipe", back_populates="meal_plan", cascade="all, delete-orphan")


class MealPlanRecipe(Base):
    __tablename__ = "meal_plan_recipes"

    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    servings = Column(Integer, nullable=False)
    meal_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    meal_plan = relationship("MealPlan", back_populates="recipe_links")
    recipe = relationship("Recipe")

    __table_args__ = (UniqueConstraint("meal_plan_id", "recipe_id"),)


class GroceryList(Base):
    __tablename__ = "grocery_lists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False, default="Groceries")

    owner = relationship("User", back_populates="grocery_lists")
    items = relationship("GroceryListItem", back_populates="grocery_list", cascade="all, delete-orphan")


class GroceryListItem(Base):
    __tablename__ = "grocery_list_items"

    id = Column(Integer, primary_key=True, index=True)
    grocery_list_id = Column(Integer, ForeignKey("grocery_lists.id"), nullable=False)
    display_name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=0)
    unit = Column(String(50), nullable=True)
    checked_off = Column(Boolean, nullable=False, default=False)
    source_type = Column(String(32), nullable=False, default="manual")
    source_recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    source_recipe_name = Column(String(255), nullable=True)

    grocery_list = relationship("GroceryList", back_populates="items")
    source_recipe = relationship("Recipe")
    sources = relationship("GroceryItemSource", back_populates="grocery_list_item", cascade="all, delete-orphan")


class GroceryItemSource(Base):
    __tablename__ = "grocery_item_sources"

    id = Column(Integer, primary_key=True, index=True)
    grocery_list_item_id = Column(Integer, ForeignKey("grocery_list_items.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    recipe_title = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit = Column(String(50), nullable=True)

    grocery_list_item = relationship("GroceryListItem", back_populates="sources")
    recipe = relationship("Recipe")

    __table_args__ = (UniqueConstraint("grocery_list_item_id", "recipe_id"),)

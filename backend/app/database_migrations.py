from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

from app.models import RecipeInstructionIngredient


INSTRUCTION_INGREDIENTS_TABLE = "recipe_instruction_ingredients"
RECIPE_SOURCE_COLUMN = "source"


def ensure_instruction_ingredient_links(connection: Connection) -> None:
    """Create the instruction-to-ingredient join table for existing databases."""
    RecipeInstructionIngredient.__table__.create(connection, checkfirst=True)

    connection.execute(
        text(
            f"CREATE INDEX IF NOT EXISTS idx_{INSTRUCTION_INGREDIENTS_TABLE}_instruction "
            f"ON {INSTRUCTION_INGREDIENTS_TABLE}(instruction_id)"
        )
    )
    connection.execute(
        text(
            f"CREATE INDEX IF NOT EXISTS idx_{INSTRUCTION_INGREDIENTS_TABLE}_ingredient "
            f"ON {INSTRUCTION_INGREDIENTS_TABLE}(ingredient_id)"
        )
    )


def ensure_recipe_source_column(connection: Connection) -> None:
    """Add the optional user-provided recipe source to existing databases."""
    columns = inspect(connection).get_columns("recipes")
    if not any(column["name"] == RECIPE_SOURCE_COLUMN for column in columns):
        connection.execute(text("ALTER TABLE recipes ADD COLUMN source TEXT"))

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.models import RecipeInstructionIngredient


INSTRUCTION_INGREDIENTS_TABLE = "recipe_instruction_ingredients"


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

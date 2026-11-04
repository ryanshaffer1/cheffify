import os
import tempfile
from pathlib import Path

_test_database_directory = tempfile.TemporaryDirectory(prefix="cheffify-tests-")
_test_database_path = Path(_test_database_directory.name) / "cheffify-test.db"
_production_database_path = Path(__file__).resolve().parents[1] / "cheffify.db"
if _test_database_path.resolve() == _production_database_path.resolve():
    raise RuntimeError("Backend tests must not use the production database")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_database_path.as_posix()}"

from app.database import engine
from app.database_migrations import (
    ensure_recipe_estimated_cooking_time_column,
    ensure_instruction_ingredient_links,
    ensure_recipe_source_column,
)
from app.models import Base

Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    ensure_recipe_estimated_cooking_time_column(connection)
    ensure_instruction_ingredient_links(connection)
    ensure_recipe_source_column(connection)


def pytest_unconfigure() -> None:
    engine.dispose()
    _test_database_directory.cleanup()

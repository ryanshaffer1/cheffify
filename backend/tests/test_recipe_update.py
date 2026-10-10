from fastapi.testclient import TestClient

from app.database import engine
from app.database_migrations import ensure_recipe_source_column
from app.main import app
from app.models import Base


Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    ensure_recipe_source_column(connection)


client = TestClient(app)


def _create_recipe(source: str | None = None) -> dict:
    response = client.post(
        "/api/recipes",
        json={
            "title": "Ingredient Link Test",
            "description": "Recipe used to verify instruction links",
            "default_servings": 2,
            "servings_min": 1,
            "servings_max": 4,
            "source": source,
            "keywords": ["dinner"],
            "tools": [],
            "ingredients": [
                {
                    "display_name": "Tomato",
                    "normalized_name": "tomato",
                    "quantity": 2,
                    "unit": "item",
                    "is_optional": False,
                    "notes": None,
                },
                {
                    "display_name": "Onion",
                    "normalized_name": "onion",
                    "quantity": 1,
                    "unit": "item",
                    "is_optional": False,
                    "notes": None,
                },
            ],
            "instructions": [
                {
                    "step_number": 1,
                    "instruction": "Chop the vegetables.",
                    "ingredient_names": ["tomato", "onion"],
                }
            ],
            "nutrition": None,
        },
    )

    assert response.status_code == 201, response.text
    return response.json()


def test_update_removes_instruction_ingredient_links() -> None:
    recipe = _create_recipe()

    response = client.put(
        f"/api/recipes/{recipe['id']}",
        json={
            "title": recipe["title"],
            "description": recipe["description"],
            "default_servings": recipe["default_servings"],
            "servings_min": recipe["servings_min"],
            "servings_max": recipe["servings_max"],
            "keywords": recipe["keywords"],
            "tools": recipe["tools"],
            "ingredients": recipe["ingredients"],
            "instructions": [
                {
                    "step_number": 1,
                    "instruction": "Chop the vegetables.",
                    "ingredient_ids": [],
                    "ingredient_names": [],
                }
            ],
            "nutrition": None,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["instructions"][0]["ingredient_ids"] == []

    fresh_response = client.get(f"/api/recipes/{recipe['id']}")
    assert fresh_response.status_code == 200, fresh_response.text
    assert fresh_response.json()["instructions"][0]["ingredient_ids"] == []


def test_update_adds_new_ingredient_and_links_it_in_same_save() -> None:
    recipe = _create_recipe()

    response = client.put(
        f"/api/recipes/{recipe['id']}",
        json={
            "title": recipe["title"],
            "description": recipe["description"],
            "default_servings": recipe["default_servings"],
            "servings_min": recipe["servings_min"],
            "servings_max": recipe["servings_max"],
            "keywords": recipe["keywords"],
            "tools": recipe["tools"],
            "ingredients": [
                *recipe["ingredients"],
                {
                    "id": None,
                    "display_name": "Cucumber",
                    "normalized_name": "cucumber",
                    "quantity": 1,
                    "unit": "item",
                    "is_optional": False,
                    "notes": None,
                },
            ],
            "instructions": [
                {
                    "step_number": 1,
                    "instruction": "Chop the vegetables.",
                    "ingredient_ids": [],
                    "ingredient_names": ["tomato", "onion", "cucumber"],
                }
            ],
            "nutrition": None,
        },
    )

    assert response.status_code == 200, response.text
    updated_recipe = response.json()
    new_ingredient_id = next(
        ingredient["id"]
        for ingredient in updated_recipe["ingredients"]
        if ingredient["display_name"] == "Cucumber"
    )
    assert updated_recipe["instructions"][0]["ingredient_ids"] == [
        ingredient["id"]
        for ingredient in updated_recipe["ingredients"]
        if ingredient["display_name"] in {"Tomato", "Onion", "Cucumber"}
    ]
    assert new_ingredient_id in updated_recipe["instructions"][0]["ingredient_ids"]


def test_recipe_source_persists_across_create_update_and_read() -> None:
    recipe = _create_recipe("Family cookbook, page 42")
    assert recipe["source"] == "Family cookbook, page 42"
    recipe_id = recipe["id"]

    create_with_source = client.put(
        f"/api/recipes/{recipe_id}",
        json={
            "title": recipe["title"],
            "description": recipe["description"],
            "default_servings": recipe["default_servings"],
            "servings_min": recipe["servings_min"],
            "servings_max": recipe["servings_max"],
            "source": "Grandma's handwritten recipe book",
            "keywords": recipe["keywords"],
            "tools": recipe["tools"],
            "ingredients": recipe["ingredients"],
            "instructions": recipe["instructions"],
            "nutrition": None,
        },
    )

    assert create_with_source.status_code == 200, create_with_source.text
    assert create_with_source.json()["source"] == "Grandma's handwritten recipe book"

    fresh_response = client.get(f"/api/recipes/{recipe_id}")
    assert fresh_response.status_code == 200, fresh_response.text
    assert fresh_response.json()["source"] == "Grandma's handwritten recipe book"

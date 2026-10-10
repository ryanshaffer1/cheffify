from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _create_recipe() -> dict:
    response = client.post(
        "/api/recipes",
        json={
            "title": "Ingredient Link Test",
            "description": "Recipe used to verify instruction links",
            "default_servings": 2,
            "servings_min": 1,
            "servings_max": 4,
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

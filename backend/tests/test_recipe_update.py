import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _create_recipe(source: str | None = None, title: str | None = None) -> dict:
    response = client.post(
        "/api/recipes",
        json={
            "title": title or f"Ingredient Link Test {uuid.uuid4().hex}",
            "description": "Recipe used to verify instruction links",
            "default_servings": 2,
            "servings_min": 1,
            "servings_max": 4,
            "source": source,
            "tags": ["dinner"],
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
            "tags": recipe["tags"],
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
            "tags": recipe["tags"],
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
            "tags": recipe["tags"],
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


def test_update_reorders_existing_instruction_steps() -> None:
    recipe = _create_recipe()
    recipe_id = recipe["id"]
    two_steps = [
        {
            "step_number": 1,
            "instruction": "First step",
            "ingredient_ids": [],
            "ingredient_names": [],
        },
        {
            "step_number": 2,
            "instruction": "Second step",
            "ingredient_ids": [],
            "ingredient_names": [],
        },
    ]
    initial_update = client.put(
        f"/api/recipes/{recipe_id}",
        json={
            "title": recipe["title"],
            "description": recipe["description"],
            "default_servings": recipe["default_servings"],
            "servings_min": recipe["servings_min"],
            "servings_max": recipe["servings_max"],
            "tags": recipe["tags"],
            "tools": recipe["tools"],
            "ingredients": recipe["ingredients"],
            "instructions": two_steps,
            "nutrition": None,
        },
    )
    assert initial_update.status_code == 200, initial_update.text
    assert [step["instruction"] for step in initial_update.json()["instructions"]] == [
        "First step",
        "Second step",
    ]

    reordered = client.put(
        f"/api/recipes/{recipe_id}",
        json={
            "title": recipe["title"],
            "description": recipe["description"],
            "default_servings": recipe["default_servings"],
            "servings_min": recipe["servings_min"],
            "servings_max": recipe["servings_max"],
            "tags": recipe["tags"],
            "tools": recipe["tools"],
            "ingredients": recipe["ingredients"],
            "instructions": [
                {**two_steps[1], "step_number": 1},
                {**two_steps[0], "step_number": 2},
            ],
            "nutrition": None,
        },
    )
    assert reordered.status_code == 200, reordered.text

    fresh = client.get(f"/api/recipes/{recipe_id}")
    assert fresh.status_code == 200, fresh.text
    assert [step["instruction"] for step in fresh.json()["instructions"]] == [
        "Second step",
        "First step",
    ]


def test_create_rejects_duplicate_recipe_title_case_insensitively() -> None:
    recipe = _create_recipe(title="Family Pasta")

    response = client.post(
        "/api/recipes",
        json={"title": "  family   pasta ", "default_servings": 2},
    )

    assert response.status_code == 409, response.text
    assert "already exists" in response.json()["detail"]
    assert client.get(f"/api/recipes/{recipe['id']}").status_code == 200


def test_update_rejects_another_recipe_title_but_allows_own_title() -> None:
    recipe = _create_recipe(title="First Recipe")
    other_recipe = _create_recipe(title="Second Recipe")

    conflict = client.put(
        f"/api/recipes/{recipe['id']}",
        json={"title": other_recipe["title"], "default_servings": 2},
    )
    assert conflict.status_code == 409, conflict.text

    unchanged_name = client.put(
        f"/api/recipes/{recipe['id']}",
        json={"title": recipe["title"], "default_servings": 2},
    )
    assert unchanged_name.status_code == 200, unchanged_name.text

    renamed = client.put(
        f"/api/recipes/{recipe['id']}",
        json={"title": "A New Recipe Name", "default_servings": 2},
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["title"] == "A New Recipe Name"


def test_recipe_description_defaults_to_none_when_omitted() -> None:
    response = client.post(
        "/api/recipes",
        json={"title": f"No Description {uuid.uuid4().hex}", "default_servings": 2},
    )

    assert response.status_code == 201, response.text
    recipe_id = response.json()["id"]
    assert response.json()["description"] is None

    fresh_response = client.get(f"/api/recipes/{recipe_id}")
    assert fresh_response.status_code == 200, fresh_response.text
    assert fresh_response.json()["description"] is None


def test_estimated_cooking_time_persists_on_create_and_update() -> None:
    created = client.post(
        "/api/recipes",
        json={
            "title": f"Timed Recipe {uuid.uuid4().hex}",
            "default_servings": 2,
            "estimated_cooking_time_minutes": 35,
        },
    )
    assert created.status_code == 201, created.text
    recipe_id = created.json()["id"]
    assert created.json()["estimated_cooking_time_minutes"] == 35

    updated = client.put(
        f"/api/recipes/{recipe_id}",
        json={
            "title": created.json()["title"],
            "default_servings": 2,
            "estimated_cooking_time_minutes": 50,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["estimated_cooking_time_minutes"] == 50

    fresh = client.get(f"/api/recipes/{recipe_id}")
    assert fresh.status_code == 200, fresh.text
    assert fresh.json()["estimated_cooking_time_minutes"] == 50


def test_recipe_tags_are_title_cased_and_deduplicated_on_save() -> None:
    created = client.post(
        "/api/recipes",
        json={
            "title": f"Tagged Recipe {uuid.uuid4().hex}",
            "default_servings": 2,
            "tags": [" quick", "QUICK", "dairy-free", "Dairy-Free", "family   meals"],
        },
    )
    assert created.status_code == 201, created.text
    assert set(created.json()["tags"]) == {"Quick", "Dairy-Free", "Family Meals"}

    updated = client.put(
        f"/api/recipes/{created.json()['id']}",
        json={
            "title": created.json()["title"],
            "default_servings": 2,
            "tags": ["meal prep", "MEAL PREP"],
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["tags"] == ["Meal Prep"]

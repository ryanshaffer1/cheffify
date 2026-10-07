from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.recipe_parsing import merge_text_with_overlap, parse_recipe


client = TestClient(app)


def test_merge_text_with_overlap_removes_repeated_boundary_lines() -> None:
    assert (
        merge_text_with_overlap(
            [
                "Recipe title\nInstructions\n1. Boil pasta.",
                "1. Boil pasta.\n2. Drain pasta.",
            ]
        )
        == "Recipe title\nInstructions\n1. Boil pasta.\n2. Drain pasta."
    )


def test_parse_recipe_structures_imported_text() -> None:
    raw = """Jasmine Rice Bowl

Tags: quick, vegetarian
Serves: 4

Ingredients
- ½ cup jasmine rice
- 1/2 tablespoon sesame oil
- 2 eggs

Instructions
1. Cook the rice.
2. Stir-fry the vegetables.

Cookware
- Saucepan

Nutrition
Calories: 420
Protein: 18g
Carbs: 52g
Fat: 13g
Fiber: 4g
"""

    recipe = parse_recipe(raw)

    assert recipe["title"] == "Jasmine Rice Bowl"
    assert recipe["keywords"] == ["quick", "vegetarian"]
    assert recipe["default_servings"] == 4
    assert recipe["ingredients"] == [
        {
            "display_name": "jasmine rice",
            "normalized_name": "jasmine rice",
            "quantity": 0.5,
            "unit": "cup",
        },
        {
            "display_name": "sesame oil",
            "normalized_name": "sesame oil",
            "quantity": 0.5,
            "unit": "tablespoon",
        },
        {"display_name": "eggs", "normalized_name": "eggs", "quantity": 2, "unit": ""},
    ]
    assert recipe["instructions"] == [
        {"step_number": 1, "instruction": "Cook the rice."},
        {"step_number": 2, "instruction": "Stir-fry the vegetables."},
    ]
    assert recipe["tools"] == ["Saucepan"]
    assert recipe["nutrition"] == {
        "calories": 420,
        "protein_g": 18,
        "carbs_g": 52,
        "fat_g": 13,
        "fiber_g": 4,
        "notes": None,
    }


def test_parse_recipe_joins_unmarked_lines_to_numbered_instructions() -> None:
    raw = """Tomato Pasta

Instructions
1. Preheat the oven to 350 degrees.
2. Chop 2 onions and add 1/2 cup tomatoes.
   Also dice 3 tomatoes.
3. Bake for 20 minutes.
"""

    recipe = parse_recipe(raw)

    assert recipe["instructions"] == [
        {"step_number": 1, "instruction": "Preheat the oven to 350 degrees."},
        {
            "step_number": 2,
            "instruction": "Chop 2 onions and add 1/2 cup tomatoes. Also dice 3 tomatoes.",
        },
        {"step_number": 3, "instruction": "Bake for 20 minutes."},
    ]


def test_parse_recipe_recognizes_bare_numbered_steps_without_splitting_quantities() -> (
    None
):
    raw = """Tomato Pasta

Instructions
1 Preheat the oven to 350 degrees.
2 Chop 2 onions.
Also dice tomatoes.
3 Add 2 cups broth and simmer.
"""

    recipe = parse_recipe(raw)

    assert recipe["instructions"] == [
        {"step_number": 1, "instruction": "Preheat the oven to 350 degrees."},
        {"step_number": 2, "instruction": "Chop 2 onions. Also dice tomatoes."},
        {"step_number": 3, "instruction": "Add 2 cups broth and simmer."},
    ]


def test_import_endpoint_returns_structured_recipe() -> None:
    response = client.post(
        "/api/recipes/import",
        files={
            "file": (
                "recipe.txt",
                BytesIO(
                    b"Lemon Pasta\n\nIngredients\n- 1/2 cup pasta\n\nInstructions\n1. Cook pasta."
                ),
                "text/plain",
            )
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert (
        body["text"]
        == "Lemon Pasta\n\nIngredients\n- 1/2 cup pasta\n\nInstructions\n1. Cook pasta."
    )
    assert body["recipe"]["title"] == "Lemon Pasta"
    ingredient = body["recipe"]["ingredients"][0]
    assert ingredient["display_name"] == "pasta"
    assert ingredient["normalized_name"] == "pasta"
    assert ingredient["quantity"] == 0.5
    assert ingredient["unit"] == "cup"
    assert body["recipe"]["instructions"] == [
        {"step_number": 1, "instruction": "Cook pasta."}
    ]


def test_import_endpoint_accepts_ordered_overlapping_files() -> None:
    first_page = (
        "Lemon Pasta\n\nIngredients\n- 1/2 cup pasta\n\nInstructions\n1. Cook pasta."
    )
    second_page = "1. Cook pasta.\n2. Drain pasta."
    with patch(
        "app.routers.recipes.extract_text_from_file",
        side_effect=[first_page, second_page],
    ):
        response = client.post(
            "/api/recipes/import",
            files=[
                ("files", ("page-1.png", b"image-1", "image/png")),
                ("files", ("page-2.png", b"image-2", "image/png")),
            ],
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["text"] == (
        "Lemon Pasta\n\nIngredients\n- 1/2 cup pasta\n\nInstructions\n"
        "1. Cook pasta.\n2. Drain pasta."
    )
    assert body["recipe"]["instructions"] == [
        {"step_number": 1, "instruction": "Cook pasta."},
        {"step_number": 2, "instruction": "Drain pasta."},
    ]

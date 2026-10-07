import json
from io import BytesIO
from pathlib import Path
from tempfile import SpooledTemporaryFile

import pytest
from fastapi.testclient import TestClient
from starlette.datastructures import UploadFile

from app.main import app
from app.routers.recipes import import_recipe_text


client = TestClient(app)

TEST_DIR = Path(__file__).parent
GOLD_DIR = TEST_DIR / "gold"
DATA_DIR = TEST_DIR / "test_data"
RESULTS_DIR = TEST_DIR / "results"


@pytest.fixture(
    params=[
        pytest.param(
            (
                "Everything Spice Baked Salmon Rice.txt",
                "imported_salmon_recipe.json",
            ),
            id="salmon-txt",
        ),
        pytest.param(
            (
                "“Everything Spice” Baked Salmon Rice Bowl with Avocado and Tomatoes.pdf",
                "imported_salmon_recipe.json",
            ),
            id="salmon-pdf",
        ),
        pytest.param(
            (
                "Chicken, Bell Pepper, and Cashew Stir Fry Over Rice.pdf",
                "imported_stir_fry_recipe.json",
            ),
            id="stir-fry-pdf",
        ),
        pytest.param(
            (
                [
                    "Chicken, Bell Pepper, and Cashew Stir Fry Over Rice Pic 1.png",
                    "Chicken, Bell Pepper, and Cashew Stir Fry Over Rice Pic 2.png",
                ],
                "imported_stir_fry_recipe.json",
            ),
            id="stir-fry-png",
        ),
    ]
)
def recipe_file_case(request: pytest.FixtureRequest) -> tuple[Path, Path, str]:
    input_name, gold_name = request.param
    if isinstance(input_name, list):
        input_files = [DATA_DIR / name for name in input_name]
        result_name = f"{input_files[0].stem}_{input_files[0].suffix.lstrip('.')}"
    else:
        input_files = DATA_DIR / input_name
        result_name = f"{input_files.stem}_{input_files.suffix.lstrip('.')}"
    gold_file = GOLD_DIR / gold_name
    result_name += "_parsed_recipe.json"

    return input_files, gold_file, result_name


def create_mock_upload_file(
    filename: str = "test.txt",
    content: bytes = b"Hello, World!",
    content_type: str = "text/plain",
) -> UploadFile:
    spooled_file = SpooledTemporaryFile(max_size=1024 * 1024)  # noqa: SIM115
    spooled_file.write(content)
    spooled_file.seek(0)

    return UploadFile(
        file=spooled_file,
        filename=filename,
        headers={"content-type": content_type},
    )


def test_import_recipe_from_file(
    recipe_file_case: tuple[Path | list[Path], Path, str],
) -> None:
    # Unpack the input file, gold file, and result name from the fixture
    input_files, gold_file, result_name = recipe_file_case

    # Create a mock uploaded file or files from the input file paths
    if isinstance(input_files, list):
        upload_files = [
            create_mock_upload_file(filename=file.name, content=file.read_bytes())
            for file in input_files
        ]
    else:
        upload_files = create_mock_upload_file(
            filename=input_files.name, content=input_files.read_bytes()
        )

    # Extract text from the input file and parse it into a recipe dictionary
    if isinstance(upload_files, list):
        imported_data = import_recipe_text(files=upload_files)
    else:
        imported_data = import_recipe_text(file=upload_files)
    imported_recipe = imported_data["recipe"]

    # Write the parsed recipe to the result file for inspection
    result_file = RESULTS_DIR / result_name
    result_file.parent.mkdir(parents=True, exist_ok=True)
    result_file.write_text(
        json.dumps(imported_recipe, ensure_ascii=False, indent=4), encoding="utf-8"
    )

    # Load the expected recipe from the gold file and compare it to the parsed recipe
    expected_recipe = json.loads(gold_file.read_text(encoding="utf-8"))
    assert imported_recipe == expected_recipe

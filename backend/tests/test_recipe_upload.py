from io import BytesIO

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_upload_recipe_image_returns_url() -> None:
    response = client.post(
        "/api/recipes/upload-image",
        files={"file": ("test.png", BytesIO(b"fakepngbytes"), "image/png")},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["image_url"].startswith("/uploads/recipes/")
    assert body["image_url"].endswith(".png")

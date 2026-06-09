"""
test_api.py
End-to-end integration tests for the FitCheck.ai FastAPI backend.

Uses httpx.AsyncClient with ASGI transport — no real HTTP server needed.
Tests the full stack: route → feature extraction → ChromaDB → response.

Run with:
    cd backend && pytest ../tests/test_api.py -v
"""

import sys
import os
import io
import shutil
import uuid
import pytest
import pytest_asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx
from main import app

TEST_CHROMA_PATH = "/tmp/fitcheck_api_test_chromadb"
TEST_UPLOAD_PATH = "/tmp/fitcheck_api_test_uploads"


@pytest.fixture(autouse=True)
def patch_paths(monkeypatch):
    """Redirect ChromaDB and uploads to temp dirs for testing."""
    import recommendation.vectorstore as vs
    import main as m

    vs.CHROMA_DB_PATH = TEST_CHROMA_PATH
    vs._client = None

    from pathlib import Path
    m.UPLOAD_DIR = Path(TEST_UPLOAD_PATH)
    m.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    yield

    vs._client = None
    for path in [TEST_CHROMA_PATH, TEST_UPLOAD_PATH]:
        if os.path.exists(path):
            shutil.rmtree(path)


@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c


def _png_bytes(color=(100, 150, 200), size=(200, 300)) -> bytes:
    """Create a minimal solid-color PNG."""
    from PIL import Image
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _face_png_bytes() -> bytes:
    """Create a simple face-like PNG for onboarding."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (300, 300), (210, 180, 140))
    draw = ImageDraw.Draw(img)
    draw.ellipse([75, 50, 225, 250], fill=(198, 155, 110))
    draw.ellipse([110, 110, 140, 140], fill=(50, 35, 25))
    draw.ellipse([160, 110, 190, 140], fill=(50, 35, 25))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── /health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "FitCheck" in data["service"]


# ── /onboard ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_onboard_success(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/onboard", data={
        "user_id": uid,
        "gender": "female",
        "body_type": "athletic",
    }, files={"selfie": ("selfie.png", _face_png_bytes(), "image/png")})

    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == uid
    assert data["gender"] == "female"
    assert "skin_tone" in data
    assert "hex" in data["skin_tone"]


@pytest.mark.asyncio
async def test_onboard_skin_tone_hex_format(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/onboard", data={
        "user_id": uid, "gender": "male", "body_type": "slim",
    }, files={"selfie": ("s.png", _face_png_bytes(), "image/png")})

    assert resp.status_code == 200
    hex_val = resp.json()["skin_tone"]["hex"]
    assert hex_val.startswith("#")
    assert len(hex_val) == 7


# ── /wardrobe/add ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_add_wardrobe_item_success(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/wardrobe/add", data={
        "user_id": uid,
        "label": "navy blue shirt",
        "occasion_tags": "office,casual",
        "pattern": "solid",
    }, files={"image": ("shirt.png", _png_bytes((25, 55, 120)), "image/png")})

    assert resp.status_code == 200
    data = resp.json()
    assert "item_id" in data
    assert data["features"]["category"] == "top"
    assert data["message"] == "Item added to wardrobe"


@pytest.mark.asyncio
async def test_add_wardrobe_item_returns_color(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/wardrobe/add", data={
        "user_id": uid, "label": "red tshirt", "occasion_tags": "casual",
    }, files={"image": ("red.png", _png_bytes((200, 30, 30)), "image/png")})

    assert resp.status_code == 200
    data = resp.json()
    assert "dominant_colors" in data
    assert isinstance(data["dominant_colors"], list)


@pytest.mark.asyncio
async def test_add_multiple_items(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    items = [
        ("navy shirt", "top", "office,casual", (25, 55, 120)),
        ("beige pants", "bottom", "office,casual", (200, 185, 150)),
        ("brown shoes", "shoes", "office,casual,formal", (100, 65, 40)),
    ]
    for label, _, occasions, color in items:
        resp = await client.post("/wardrobe/add", data={
            "user_id": uid, "label": label, "occasion_tags": occasions,
        }, files={"image": ("item.png", _png_bytes(color), "image/png")})
        assert resp.status_code == 200


# ── GET /wardrobe/{user_id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_wardrobe_empty(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.get(f"/wardrobe/{uid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_items"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_wardrobe_after_add(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    await client.post("/wardrobe/add", data={
        "user_id": uid, "label": "blue shirt", "occasion_tags": "casual",
    }, files={"image": ("s.png", _png_bytes(), "image/png")})

    resp = await client.get(f"/wardrobe/{uid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_items"] == 1
    assert len(data["items"]) == 1


# ── DELETE /wardrobe/{user_id}/{item_id} ───────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_wardrobe_item(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    add_resp = await client.post("/wardrobe/add", data={
        "user_id": uid, "label": "shirt", "occasion_tags": "casual",
    }, files={"image": ("s.png", _png_bytes(), "image/png")})

    item_id = add_resp.json()["item_id"]
    del_resp = await client.delete(f"/wardrobe/{uid}/{item_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["item_id"] == item_id


@pytest.mark.asyncio
async def test_delete_nonexistent_returns_404(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    resp = await client.delete(f"/wardrobe/{uid}/nonexistent-id")
    assert resp.status_code == 404


# ── POST /recommend ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_recommend_returns_response(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"

    # Onboard
    await client.post("/onboard", data={
        "user_id": uid, "gender": "female", "body_type": "average",
    }, files={"selfie": ("s.png", _face_png_bytes(), "image/png")})

    # Upload wardrobe
    for label, color, occasions in [
        ("white blouse", (240, 238, 235), "office,formal"),
        ("black trousers", (30, 30, 35), "office,formal"),
        ("black heels", (25, 25, 30), "office,formal"),
    ]:
        await client.post("/wardrobe/add", data={
            "user_id": uid, "label": label, "occasion_tags": occasions,
        }, files={"image": ("i.png", _png_bytes(color), "image/png")})

    # Recommend
    resp = await client.post("/recommend", data={
        "user_id": uid, "occasion": "office",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == uid
    assert data["occasion"] == "office"
    assert "outfits" in data
    assert "total_outfits" in data


@pytest.mark.asyncio
async def test_recommend_outfit_structure(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"

    for label, color, occ in [
        ("red kurta", (180, 30, 30), "wedding,festival"),
        ("white salwar", (240, 240, 240), "wedding,festival"),
        ("golden sandals", (200, 170, 80), "wedding,festival"),
    ]:
        await client.post("/wardrobe/add", data={
            "user_id": uid, "label": label, "occasion_tags": occ,
        }, files={"image": ("i.png", _png_bytes(color), "image/png")})

    resp = await client.post("/recommend", data={
        "user_id": uid, "occasion": "wedding",
    })
    assert resp.status_code == 200
    outfits = resp.json().get("outfits", [])

    if outfits:
        outfit = outfits[0]
        assert "scores" in outfit
        assert "overall" in outfit["scores"]
        assert 0.0 <= outfit["scores"]["overall"] <= 1.0


# ── GET /profile/{user_id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_profile_not_found(client):
    resp = await client.get("/profile/nonexistent_user_xyz")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_profile_after_onboard(client):
    uid = f"test_{uuid.uuid4().hex[:8]}"
    await client.post("/onboard", data={
        "user_id": uid, "gender": "male", "body_type": "athletic",
    }, files={"selfie": ("s.png", _face_png_bytes(), "image/png")})

    resp = await client.get(f"/profile/{uid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == uid
    assert data["gender"] == "male"
    assert "skin_tone" in data

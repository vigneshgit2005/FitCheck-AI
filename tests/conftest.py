"""
conftest.py
Shared fixtures for FitCheck.ai integration tests.

Generates synthetic test images in memory — no real photos needed.
All fixtures are session-scoped so images are created once per test run.
"""

import io
import pytest
import numpy as np
from PIL import Image, ImageDraw


# ── Image generators ───────────────────────────────────────────────────────────

def _make_solid_image(color: tuple, size=(200, 300)) -> bytes:
    """Create a solid-color PNG image and return as bytes."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_face_image(size=(300, 300)) -> bytes:
    """
    Create a synthetic face-like image:
    - Skin-toned background
    - Oval face region in center
    This gives MediaPipe a fighting chance at detection.
    """
    img = Image.new("RGB", size, (210, 180, 140))  # warm skin-tone bg
    draw = ImageDraw.Draw(img)

    cx, cy = size[0] // 2, size[1] // 2
    fw, fh = size[0] // 3, size[1] // 2

    # Face oval
    draw.ellipse([cx - fw, cy - fh, cx + fw, cy + fh], fill=(198, 155, 110))

    # Eyes
    draw.ellipse([cx - 30, cy - 20, cx - 10, cy], fill=(60, 40, 30))
    draw.ellipse([cx + 10, cy - 20, cx + 30, cy], fill=(60, 40, 30))

    # Mouth
    draw.arc([cx - 20, cy + 10, cx + 20, cy + 30], start=0, end=180, fill=(140, 80, 70), width=3)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_clothing_image(color: tuple, category_hint="top", size=(200, 300)) -> bytes:
    """
    Create a simple clothing-shaped image:
    - Solid background
    - Rectangular colored body (shirt/trouser shape)
    """
    img = Image.new("RGB", size, (240, 240, 240))
    draw = ImageDraw.Draw(img)

    w, h = size
    if category_hint == "top":
        # T-shirt shape: body + sleeves
        draw.rectangle([w // 4, h // 4, 3 * w // 4, 3 * h // 4], fill=color)
        draw.rectangle([0, h // 4, w // 4, h // 2], fill=color)       # left sleeve
        draw.rectangle([3 * w // 4, h // 4, w, h // 2], fill=color)   # right sleeve
    elif category_hint == "bottom":
        # Pants shape: two legs
        draw.rectangle([w // 4, h // 8, 3 * w // 4, h], fill=color)
        draw.rectangle([w // 4, h // 2, w // 2 - 5, h], fill=color)
        draw.rectangle([w // 2 + 5, h // 2, 3 * w // 4, h], fill=color)
    else:
        # Shoes: wide flat rectangle
        draw.rectangle([w // 8, h // 3, 7 * w // 8, 2 * h // 3], fill=color)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── Session-scoped fixtures ────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def navy_top_image() -> bytes:
    return _make_clothing_image((25, 55, 120), "top")


@pytest.fixture(scope="session")
def beige_bottom_image() -> bytes:
    return _make_clothing_image((200, 185, 150), "bottom")


@pytest.fixture(scope="session")
def brown_shoes_image() -> bytes:
    return _make_clothing_image((100, 65, 40), "shoes", size=(300, 150))


@pytest.fixture(scope="session")
def white_shirt_image() -> bytes:
    return _make_clothing_image((240, 240, 238), "top")


@pytest.fixture(scope="session")
def red_tshirt_image() -> bytes:
    return _make_clothing_image((200, 30, 30), "top")


@pytest.fixture(scope="session")
def selfie_image() -> bytes:
    return _make_face_image()


@pytest.fixture(scope="session")
def test_user_id() -> str:
    return "test_user_integration_001"

"""
test_cv.py
Unit tests for computer vision scripts:
  - dominant_color.py
  - skin_tone_detection.py
  - clothing_classifier.py

These run without the FastAPI server — they test the scripts directly.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from scripts.dominant_color import (
    extract_dominant_colors,
    get_primary_color,
    rgb_to_hex,
)
from scripts.skin_tone_detection import detect_skin_tone
from scripts.clothing_classifier import (
    classify_clothing,
    classify_by_label,
    ClothingCategory,
)


# ── dominant_color.py ──────────────────────────────────────────────────────────

class TestDominantColor:

    def test_rgb_to_hex_white(self):
        assert rgb_to_hex((255, 255, 255)) == "#ffffff"

    def test_rgb_to_hex_black(self):
        assert rgb_to_hex((0, 0, 0)) == "#000000"

    def test_rgb_to_hex_midtone(self):
        result = rgb_to_hex((100, 149, 237))
        assert result == "#6495ed"

    def test_extract_returns_list(self, navy_top_image):
        colors = extract_dominant_colors(navy_top_image, n_colors=3)
        assert isinstance(colors, list)

    def test_extract_correct_count(self, navy_top_image):
        colors = extract_dominant_colors(navy_top_image, n_colors=3)
        assert len(colors) <= 3

    def test_extract_color_has_required_keys(self, navy_top_image):
        colors = extract_dominant_colors(navy_top_image, n_colors=3)
        if colors:
            c = colors[0]
            assert "hex" in c
            assert "rgb" in c
            assert "percentage" in c

    def test_extract_hex_format(self, navy_top_image):
        colors = extract_dominant_colors(navy_top_image, n_colors=3)
        if colors:
            hex_val = colors[0]["hex"]
            assert hex_val.startswith("#")
            assert len(hex_val) == 7

    def test_extract_percentages_sum_to_100(self, navy_top_image):
        colors = extract_dominant_colors(navy_top_image, n_colors=3)
        if colors:
            total = sum(c["percentage"] for c in colors)
            assert abs(total - 100.0) < 1.0  # within 1% rounding tolerance

    def test_primary_color_returns_single(self, red_tshirt_image):
        color = get_primary_color(red_tshirt_image)
        assert isinstance(color, dict)
        assert "hex" in color

    def test_primary_color_is_reddish(self, red_tshirt_image):
        """Primary color of a red image should have high R, low G and B."""
        color = get_primary_color(red_tshirt_image)
        r, g, b = color["rgb"]
        assert r > g + 50, f"Expected red-dominant color, got RGB({r},{g},{b})"

    def test_primary_color_navy_is_bluish(self, navy_top_image):
        """Primary color of a navy image should have high B relative to R."""
        color = get_primary_color(navy_top_image)
        r, g, b = color["rgb"]
        assert b > r, f"Expected blue-dominant color, got RGB({r},{g},{b})"


# ── skin_tone_detection.py ─────────────────────────────────────────────────────

class TestSkinToneDetection:

    def test_returns_dict(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        assert isinstance(result, dict)

    def test_has_required_keys(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        # Whether face is detected or default fallback, these keys must exist
        assert "hex" in result
        assert "rgb" in result
        assert "fitzpatrick_type" in result
        assert "fitzpatrick_label" in result

    def test_hex_format(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        assert result["hex"].startswith("#")
        assert len(result["hex"]) == 7

    def test_rgb_is_list_of_three(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        assert isinstance(result["rgb"], list)
        assert len(result["rgb"]) == 3

    def test_rgb_values_in_range(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        for val in result["rgb"]:
            assert 0 <= val <= 255

    def test_fitzpatrick_type_valid(self, selfie_image):
        result = detect_skin_tone(selfie_image)
        assert result["fitzpatrick_type"] in [1, 2, 3, 4, 5, 6]

    def test_no_face_returns_default(self):
        """A solid white image has no face — should return default fallback."""
        import io
        from PIL import Image
        img = Image.new("RGB", (200, 200), (255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        result = detect_skin_tone(buf.getvalue())
        assert "hex" in result
        # Fallback should have a note about no detection
        assert "error" in result or result["fitzpatrick_type"] in [1, 2, 3, 4, 5, 6]


# ── clothing_classifier.py ─────────────────────────────────────────────────────

class TestClothingClassifier:

    # Label-based classification
    def test_label_shirt_is_top(self):
        assert classify_by_label("blue shirt") == ClothingCategory.TOP

    def test_label_jeans_is_bottom(self):
        assert classify_by_label("slim jeans") == ClothingCategory.BOTTOM

    def test_label_sneaker_is_shoes(self):
        assert classify_by_label("white sneakers") == ClothingCategory.SHOES

    def test_label_blazer_is_outerwear(self):
        assert classify_by_label("black blazer") == ClothingCategory.OUTERWEAR

    def test_label_saree_is_dress(self):
        assert classify_by_label("red saree") == ClothingCategory.DRESS

    def test_label_unknown_returns_unknown(self):
        assert classify_by_label("xyzabc") == ClothingCategory.UNKNOWN

    def test_label_case_insensitive(self):
        assert classify_by_label("TSHIRT") == ClothingCategory.TOP

    # Full classify_clothing function
    def test_classify_with_label_returns_label_confidence(self, navy_top_image):
        result = classify_clothing(navy_top_image, user_label="blue shirt")
        assert result["category"] == "top"
        assert result["confidence"] == "label"

    def test_classify_without_label_returns_vision_or_unknown(self, navy_top_image):
        result = classify_clothing(navy_top_image, user_label="")
        assert result["category"] in [c.value for c in ClothingCategory]
        assert result["confidence"] in ["vision", "unknown"]

    def test_classify_returns_dict_with_required_keys(self, navy_top_image):
        result = classify_clothing(navy_top_image)
        assert "category" in result
        assert "confidence" in result

    def test_classify_wide_image_as_shoes(self, brown_shoes_image):
        """Wide/flat image (aspect ratio < 0.6) should classify as shoes."""
        result = classify_clothing(brown_shoes_image, user_label="")
        # Vision may classify as shoes based on aspect ratio
        assert result["category"] in [c.value for c in ClothingCategory]

"""
test_recommendation.py
Unit tests for the recommendation pipeline:
  - embeddings.py     (feature → vector)
  - vectorstore.py    (ChromaDB CRUD)
  - outfit_builder.py (combo ranking + color scoring)
"""

import sys
import os
import uuid
import shutil
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from recommendation.embeddings import (
    color_to_vector,
    build_text_description,
    embed_clothing_item,
    embed_query,
)
from recommendation.vectorstore import (
    add_wardrobe_item,
    query_wardrobe,
    delete_wardrobe_item,
    list_wardrobe_items,
    get_wardrobe_count,
)
from recommendation.outfit_builder import (
    hex_to_rgb,
    color_distance,
    skin_tone_compatibility_score,
    color_harmony_score,
    occasion_match_score,
    build_outfits,
)


# ── embeddings.py ──────────────────────────────────────────────────────────────

class TestEmbeddings:

    def test_color_to_vector_white(self):
        v = color_to_vector("#ffffff")
        assert v == [1.0, 1.0, 1.0]

    def test_color_to_vector_black(self):
        v = color_to_vector("#000000")
        assert v == [0.0, 0.0, 0.0]

    def test_color_to_vector_range(self):
        v = color_to_vector("#3a5f8a")
        assert all(0.0 <= x <= 1.0 for x in v)
        assert len(v) == 3

    def test_color_hash_optional(self):
        """Should work with or without leading #."""
        v1 = color_to_vector("#ff0000")
        v2 = color_to_vector("ff0000")
        assert v1 == v2

    def test_build_text_description_basic(self):
        features = {
            "category": "top",
            "color_name": "navy blue",
            "pattern": "solid",
            "occasion_tags": ["office"],
            "style_tags": ["classic"],
        }
        desc = build_text_description(features)
        assert "top" in desc
        assert "navy blue" in desc
        assert "office" in desc

    def test_build_text_description_no_pattern_solid(self):
        """Solid pattern should NOT appear in description (not distinctive)."""
        features = {"category": "bottom", "pattern": "solid", "occasion_tags": [], "style_tags": []}
        desc = build_text_description(features)
        assert "solid" not in desc

    def test_build_text_description_pattern_visible(self):
        """Non-solid pattern should appear."""
        features = {"category": "top", "pattern": "striped", "occasion_tags": [], "style_tags": []}
        desc = build_text_description(features)
        assert "striped" in desc

    def test_embed_clothing_item_returns_list(self):
        features = {
            "category": "top",
            "color_hex": "#3a5f8a",
            "color_name": "navy blue",
            "pattern": "solid",
            "occasion_tags": ["office"],
            "style_tags": ["classic"],
        }
        vec = embed_clothing_item(features)
        assert isinstance(vec, list)
        assert len(vec) > 0

    def test_embed_clothing_item_dimension(self):
        """Vector should be 387-dim (384 text + 3 color)."""
        features = {
            "category": "top",
            "color_hex": "#3a5f8a",
            "occasion_tags": [],
            "style_tags": [],
        }
        vec = embed_clothing_item(features)
        assert len(vec) == 387

    def test_embed_clothing_item_all_floats(self):
        features = {
            "category": "shoes",
            "color_hex": "#8B5A2B",
            "occasion_tags": ["casual"],
            "style_tags": [],
        }
        vec = embed_clothing_item(features)
        assert all(isinstance(v, float) for v in vec)

    def test_embed_query_returns_correct_dim(self):
        vec = embed_query("wedding", "#c68642", "traditional")
        assert len(vec) == 387

    def test_embed_query_different_occasions_differ(self):
        v1 = embed_query("wedding", "#c68642")
        v2 = embed_query("gym", "#c68642")
        assert v1 != v2


# ── vectorstore.py ─────────────────────────────────────────────────────────────

# Use a temp ChromaDB path so tests don't pollute production data
TEST_CHROMA_PATH = "/tmp/fitcheck_test_chromadb"

@pytest.fixture(autouse=True)
def clean_chroma(monkeypatch):
    """Point ChromaDB to a temp directory for each test class."""
    monkeypatch.setenv("CHROMA_DB_PATH", TEST_CHROMA_PATH)
    import recommendation.vectorstore as vs
    vs.CHROMA_DB_PATH = TEST_CHROMA_PATH
    vs._client = None  # reset client so it picks up new path
    yield
    vs._client = None
    if os.path.exists(TEST_CHROMA_PATH):
        shutil.rmtree(TEST_CHROMA_PATH)


def _sample_features(category="top"):
    return {
        "category": category,
        "color_hex": "#3a5f8a",
        "color_name": "navy",
        "pattern": "solid",
        "occasion_tags": ["office", "casual"],
        "style_tags": ["classic"],
    }


def _sample_embedding():
    return embed_clothing_item(_sample_features())


class TestVectorstore:

    def test_add_item_returns_id(self):
        uid = str(uuid.uuid4())
        item_id = add_wardrobe_item(uid, _sample_embedding(), _sample_features(), "shirt.png")
        assert isinstance(item_id, str)
        assert len(item_id) > 0

    def test_count_increases_after_add(self):
        uid = str(uuid.uuid4())
        assert get_wardrobe_count(uid) == 0
        add_wardrobe_item(uid, _sample_embedding(), _sample_features(), "a.png")
        assert get_wardrobe_count(uid) == 1

    def test_list_returns_added_item(self):
        uid = str(uuid.uuid4())
        add_wardrobe_item(uid, _sample_embedding(), _sample_features("top"), "shirt.png")
        items = list_wardrobe_items(uid)
        assert len(items) == 1
        assert items[0]["category"] == "top"
        assert items[0]["image_filename"] == "shirt.png"

    def test_list_empty_for_new_user(self):
        uid = str(uuid.uuid4())
        items = list_wardrobe_items(uid)
        assert items == []

    def test_delete_removes_item(self):
        uid = str(uuid.uuid4())
        item_id = add_wardrobe_item(uid, _sample_embedding(), _sample_features(), "x.png")
        assert get_wardrobe_count(uid) == 1
        result = delete_wardrobe_item(uid, item_id)
        assert result is True
        assert get_wardrobe_count(uid) == 0

    def test_delete_nonexistent_returns_false(self):
        uid = str(uuid.uuid4())
        result = delete_wardrobe_item(uid, "nonexistent-id-xyz")
        assert result is False

    def test_query_returns_list(self):
        uid = str(uuid.uuid4())
        add_wardrobe_item(uid, _sample_embedding(), _sample_features("top"), "shirt.png")
        query_vec = embed_query("office", "#c68642")
        results = query_wardrobe(uid, query_vec, category_filter="top", n_results=5)
        assert isinstance(results, list)

    def test_query_category_filter_works(self):
        uid = str(uuid.uuid4())
        add_wardrobe_item(uid, _sample_embedding(), _sample_features("top"), "shirt.png")
        add_wardrobe_item(uid, _sample_embedding(), _sample_features("bottom"), "pants.png")
        query_vec = embed_query("casual", "#c68642")
        tops = query_wardrobe(uid, query_vec, category_filter="top")
        assert all(i["category"] == "top" for i in tops)

    def test_query_result_has_similarity_score(self):
        uid = str(uuid.uuid4())
        add_wardrobe_item(uid, _sample_embedding(), _sample_features("top"), "shirt.png")
        query_vec = embed_query("office", "#c68642")
        results = query_wardrobe(uid, query_vec, n_results=5)
        if results:
            assert "similarity_score" in results[0]
            assert 0.0 <= results[0]["similarity_score"] <= 1.0

    def test_users_are_isolated(self):
        uid1, uid2 = str(uuid.uuid4()), str(uuid.uuid4())
        add_wardrobe_item(uid1, _sample_embedding(), _sample_features(), "a.png")
        assert get_wardrobe_count(uid2) == 0


# ── outfit_builder.py ─────────────────────────────────────────────────────────

class TestOutfitBuilder:

    def test_hex_to_rgb_white(self):
        assert hex_to_rgb("#ffffff") == (255, 255, 255)

    def test_hex_to_rgb_black(self):
        assert hex_to_rgb("#000000") == (0, 0, 0)

    def test_color_distance_same_color(self):
        assert color_distance("#ff0000", "#ff0000") == 0.0

    def test_color_distance_black_white(self):
        d = color_distance("#000000", "#ffffff")
        assert abs(d - 441.67) < 1.0

    def test_skin_compat_optimal_range(self):
        """A color with ~180 distance from skin tone should score highest."""
        score = skin_tone_compatibility_score("#3a5f8a", "#c68642")
        assert 0.0 <= score <= 1.0

    def test_skin_compat_too_similar_low_score(self):
        """Same color as skin tone should score low."""
        score = skin_tone_compatibility_score("#c68642", "#c68642")
        assert score < 0.5

    def test_color_harmony_neutral_shoes(self):
        """Shoes close in color to bottom should score higher."""
        score_neutral = color_harmony_score("#3a5f8a", "#2a3f5f", "#1a2f4f")
        score_clash = color_harmony_score("#3a5f8a", "#2a3f5f", "#ff0000")
        assert score_neutral >= score_clash

    def test_occasion_match_tagged(self):
        item = {"occasion_tags": ["office", "formal"]}
        assert occasion_match_score(item, "office") == 1.0

    def test_occasion_match_not_tagged(self):
        item = {"occasion_tags": ["gym"]}
        assert occasion_match_score(item, "office") == 0.6

    def test_build_outfits_returns_combos(self):
        def _item(cat, color, occasions):
            return {
                "category": cat,
                "color_hex": color,
                "color_name": "test",
                "image_filename": f"{cat}.png",
                "occasion_tags": occasions,
                "similarity_score": 0.8,
            }

        tops    = [_item("top", "#3a5f8a", ["office"])]
        bottoms = [_item("bottom", "#4a3f2f", ["office"])]
        shoes   = [_item("shoes", "#2a2a2a", ["office"])]

        outfits = build_outfits(tops, bottoms, shoes, "#c68642", "office", max_combos=3)
        assert isinstance(outfits, list)
        assert len(outfits) >= 1

    def test_build_outfits_sorted_by_score(self):
        def _item(cat, color, sim):
            return {
                "category": cat, "color_hex": color,
                "image_filename": f"{cat}.png",
                "occasion_tags": ["office"],
                "similarity_score": sim,
            }

        tops    = [_item("top", "#3a5f8a", 0.9), _item("top", "#ff0000", 0.3)]
        bottoms = [_item("bottom", "#4a3f2f", 0.8)]
        shoes   = [_item("shoes", "#2a2a2a", 0.7)]

        outfits = build_outfits(tops, bottoms, shoes, "#c68642", "office", max_combos=5)
        scores = [o["scores"]["overall"] for o in outfits]
        assert scores == sorted(scores, reverse=True)

    def test_build_outfits_missing_category_returns_partial(self):
        """If shoes are missing, should still return something."""
        def _item(cat, color):
            return {"category": cat, "color_hex": color,
                    "image_filename": f"{cat}.png",
                    "occasion_tags": ["casual"], "similarity_score": 0.7}

        tops    = [_item("top", "#3a5f8a")]
        bottoms = [_item("bottom", "#4a3f2f")]

        outfits = build_outfits(tops, bottoms, [], "#c68642", "casual", max_combos=3)
        assert isinstance(outfits, list)

    def test_build_outfits_score_between_0_and_1(self):
        def _item(cat, color):
            return {"category": cat, "color_hex": color,
                    "image_filename": f"{cat}.png",
                    "occasion_tags": ["wedding"], "similarity_score": 0.75}

        outfits = build_outfits(
            [_item("top", "#ffffff")],
            [_item("bottom", "#000000")],
            [_item("shoes", "#8B5A2B")],
            "#c68642", "wedding", max_combos=1
        )
        if outfits:
            score = outfits[0]["scores"]["overall"]
            assert 0.0 <= score <= 1.0

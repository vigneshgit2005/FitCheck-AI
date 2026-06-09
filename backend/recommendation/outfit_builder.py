"""
outfit_builder.py
Builds complete outfit combinations (top + bottom + shoes) from wardrobe query results.

Scoring strategy:
  1. Each item has a similarity_score from ChromaDB (0–1, higher is better).
  2. Color harmony bonus: skin-tone-compatible colors score higher.
  3. Occasion match bonus: items tagged for the requested occasion score higher.
  4. Combo score = weighted average of the three item scores + bonuses.
"""

import math
from itertools import product as cartesian_product


# ── Color harmony ──────────────────────────────────────────────────────────────

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def color_distance(hex1: str, hex2: str) -> float:
    """Euclidean distance between two RGB colors (0–441 max)."""
    r1, g1, b1 = hex_to_rgb(hex1)
    r2, g2, b2 = hex_to_rgb(hex2)
    return math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)


def skin_tone_compatibility_score(item_color: str, skin_tone_hex: str) -> float:
    """
    Returns a 0–1 score for how well a clothing color suits a skin tone.
    
    Strategy: Colors that are neither too close (washes out) nor too far
    (clashes) from the skin tone score highest.
    Optimal distance range: 80–280 in RGB space.
    """
    dist = color_distance(item_color, skin_tone_hex)
    if 80 <= dist <= 280:
        # Peak compatibility in this range
        return 1.0 - abs(dist - 180) / 180
    elif dist < 80:
        return dist / 80 * 0.5  # Too similar — low score
    else:
        return max(0.0, 1.0 - (dist - 280) / 161)  # Too different — fades


def color_harmony_score(top_hex: str, bottom_hex: str, shoes_hex: str) -> float:
    """
    Checks if the three item colors work together.
    Rewards neutral shoes, penalizes three clashing bright colors.
    """
    top_bottom_dist = color_distance(top_hex, bottom_hex)
    bottom_shoes_dist = color_distance(bottom_hex, shoes_hex)

    # Good outfits: top and bottom contrast moderately (60–200), shoes neutral or complementary
    top_bottom_score = 1.0 if 60 <= top_bottom_dist <= 200 else 0.6
    shoes_neutral = bottom_shoes_dist < 120  # shoes close to bottom = grounded look
    shoes_score = 0.85 if shoes_neutral else 0.7

    return (top_bottom_score + shoes_score) / 2


# ── Occasion match ─────────────────────────────────────────────────────────────

def occasion_match_score(item: dict, occasion: str) -> float:
    """Returns 1.0 if item is tagged for the occasion, 0.6 otherwise."""
    tags = [t.strip().lower() for t in item.get("occasion_tags", [])]
    return 1.0 if occasion.lower() in tags else 0.6


# ── Main outfit builder ────────────────────────────────────────────────────────

def build_outfits(
    tops: list[dict],
    bottoms: list[dict],
    shoes: list[dict],
    skin_tone_hex: str,
    occasion: str,
    max_combos: int = 5,
) -> list[dict]:
    """
    Generates ranked outfit combinations from top/bottom/shoes candidates.

    Args:
        tops, bottoms, shoes: Lists of wardrobe items per category.
        skin_tone_hex: User's detected skin tone hex color.
        occasion: Occasion string (e.g. "wedding", "office").
        max_combos: Max number of outfit combos to return.

    Returns:
        Sorted list of outfit combo dicts, best match first.
    """
    if not tops or not bottoms or not shoes:
        # If a category is missing, return single-item suggestions
        available = tops or bottoms or shoes
        return [
            {
                "items": [item],
                "score": item.get("similarity_score", 0.5),
                "note": "Incomplete wardrobe — upload more items for full outfit combos",
            }
            for item in available[:max_combos]
        ]

    combos = []

    for top, bottom, shoe in cartesian_product(
        tops[:6], bottoms[:6], shoes[:6]
    ):  # cap at 216 combos max
        # Base scores from vector similarity
        base_score = (
            top.get("similarity_score", 0.5) * 0.35
            + bottom.get("similarity_score", 0.5) * 0.35
            + shoe.get("similarity_score", 0.5) * 0.15
        )

        # Color harmony bonus
        harmony = color_harmony_score(
            top.get("color_hex", "#888888"),
            bottom.get("color_hex", "#888888"),
            shoe.get("color_hex", "#888888"),
        )

        # Skin tone compatibility bonus
        skin_compat = (
            skin_tone_compatibility_score(top.get("color_hex", "#888"), skin_tone_hex) * 0.5
            + skin_tone_compatibility_score(bottom.get("color_hex", "#888"), skin_tone_hex) * 0.3
            + skin_tone_compatibility_score(shoe.get("color_hex", "#888"), skin_tone_hex) * 0.2
        )

        # Occasion match bonus
        occasion_score = (
            occasion_match_score(top, occasion) * 0.4
            + occasion_match_score(bottom, occasion) * 0.4
            + occasion_match_score(shoe, occasion) * 0.2
        )

        # Final weighted combo score
        final_score = (
            base_score * 0.35
            + harmony * 0.20
            + skin_compat * 0.25
            + occasion_score * 0.20
        )

        combos.append(
            {
                "top": top,
                "bottom": bottom,
                "shoes": shoe,
                "items": [top, bottom, shoe],
                "scores": {
                    "overall": round(final_score, 4),
                    "vector_similarity": round(base_score, 4),
                    "color_harmony": round(harmony, 4),
                    "skin_compatibility": round(skin_compat, 4),
                    "occasion_match": round(occasion_score, 4),
                },
            }
        )

    combos.sort(key=lambda c: c["scores"]["overall"], reverse=True)
    return combos[:max_combos]

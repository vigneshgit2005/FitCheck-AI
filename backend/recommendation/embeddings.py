"""
embeddings.py
Converts extracted clothing features into a single embedding vector
that ChromaDB can store and query.

Strategy:
  - Text features (occasion tags, style, category) → sentence-transformer embedding
  - Color features (hex RGB) → normalized 3D color vector
  - Final vector = concatenation of both, stored in ChromaDB metadata + embedding
"""

import numpy as np
from sentence_transformers import SentenceTransformer

_model = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def color_to_vector(hex_color: str) -> list[float]:
    """Convert hex color string to normalized [R, G, B] float vector."""
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return [r / 255.0, g / 255.0, b / 255.0]


def build_text_description(features: dict) -> str:
    """
    Build a natural language description of a clothing item for embedding.
    
    features dict should contain:
        category, occasion_tags, style_tags, color_name, pattern
    """
    parts = []
    category = features.get("category", "clothing")
    parts.append(category)

    color_name = features.get("color_name", "")
    if color_name:
        parts.append(color_name)

    pattern = features.get("pattern", "")
    if pattern and pattern != "solid":
        parts.append(pattern)

    occasions = features.get("occasion_tags", [])
    if occasions:
        parts.append("suitable for " + ", ".join(occasions))

    styles = features.get("style_tags", [])
    if styles:
        parts.append(", ".join(styles) + " style")

    return " ".join(parts)


def embed_clothing_item(features: dict) -> list[float]:
    """
    Creates a combined embedding for a clothing item.

    Args:
        features: {
            "category": "top",
            "color_hex": "#3a5f8a",
            "color_name": "navy blue",
            "pattern": "solid",
            "occasion_tags": ["office", "formal"],
            "style_tags": ["classic", "minimalist"],
        }

    Returns:
        Combined embedding vector (list of floats) ready for ChromaDB.
    """
    model = _get_model()
    description = build_text_description(features)
    text_embedding = model.encode(description).tolist()  # 384-dim

    color_hex = features.get("color_hex", "#888888")
    color_vec = color_to_vector(color_hex)  # 3-dim

    # Normalize color vec to match text embedding scale (approximate)
    color_vec_scaled = [v * 0.5 for v in color_vec]

    combined = text_embedding + color_vec_scaled  # 387-dim
    return combined


def embed_query(occasion: str, skin_tone_hex: str, style_preference: str = "") -> list[float]:
    """
    Creates a query embedding from occasion + skin tone + style preference.
    Used at recommendation time to find closest wardrobe items.

    Args:
        occasion: "wedding", "office", etc.
        skin_tone_hex: "#c68642"
        style_preference: optional free text like "traditional" or "casual"

    Returns:
        Combined query embedding vector.
    """
    model = _get_model()

    description_parts = [f"outfit for {occasion}"]
    if style_preference:
        description_parts.append(style_preference + " style")

    description = " ".join(description_parts)
    text_embedding = model.encode(description).tolist()

    color_vec = color_to_vector(skin_tone_hex)
    color_vec_scaled = [v * 0.5 for v in color_vec]

    return text_embedding + color_vec_scaled

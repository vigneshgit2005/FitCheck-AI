"""
clothing_classifier.py
Classifies uploaded clothing images into categories:
  top | bottom | shoes | outerwear | accessory

Uses a rule-based approach combining:
- Image aspect ratio (tall images → tops/dresses, wide → bottoms/shoes)
- Color distribution
- Filename/metadata hints (if provided)

For production, swap classify_by_vision() with a fine-tuned CNN
(e.g. fashion-mnist or DeepFashion checkpoint).
"""

import cv2
import numpy as np
from enum import Enum


class ClothingCategory(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    SHOES = "shoes"
    OUTERWEAR = "outerwear"
    ACCESSORY = "accessory"
    DRESS = "dress"
    UNKNOWN = "unknown"


# Keywords that strongly hint at category when in filename/user label
KEYWORD_MAP = {
    ClothingCategory.TOP: ["shirt", "tshirt", "t-shirt", "blouse", "top", "crop", "tank", "polo", "sweater", "hoodie", "sweatshirt", "kurta", "kurti"],
    ClothingCategory.BOTTOM: ["pant", "trouser", "jeans", "shorts", "skirt", "leggings", "dhoti", "salwar"],
    ClothingCategory.SHOES: ["shoe", "boot", "sneaker", "sandal", "heel", "slipper", "loafer", "chappal", "footwear"],
    ClothingCategory.OUTERWEAR: ["jacket", "coat", "blazer", "vest", "cardigan", "overcoat"],
    ClothingCategory.DRESS: ["dress", "gown", "saree", "sari", "lehenga", "frock", "maxi", "jumpsuit"],
    ClothingCategory.ACCESSORY: ["belt", "scarf", "hat", "cap", "tie", "watch", "bag", "sunglasses", "jewelry"],
}

# Occasion → compatible categories for outfit building
OCCASION_CATEGORY_MAP = {
    "wedding":       [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.DRESS, ClothingCategory.OUTERWEAR, ClothingCategory.SHOES],
    "office":        [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.OUTERWEAR, ClothingCategory.SHOES],
    "casual":        [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.SHOES],
    "party":         [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.DRESS, ClothingCategory.SHOES],
    "gym":           [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.SHOES],
    "beach":         [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.SHOES],
    "date":          [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.DRESS, ClothingCategory.SHOES],
    "festival":      [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.DRESS, ClothingCategory.SHOES],
    "formal":        [ClothingCategory.TOP, ClothingCategory.BOTTOM, ClothingCategory.OUTERWEAR, ClothingCategory.SHOES],
}


def classify_by_label(label: str) -> ClothingCategory:
    """Check user-provided label/filename for category keywords."""
    label_lower = label.lower()
    for category, keywords in KEYWORD_MAP.items():
        if any(kw in label_lower for kw in keywords):
            return category
    return ClothingCategory.UNKNOWN


def classify_by_vision(image_bytes: bytes) -> ClothingCategory:
    """
    Heuristic vision-based classification using aspect ratio + position of mass.
    
    Tall images with color mass in upper half → likely a top.
    Tall images with color mass in lower half → likely a bottom.
    Very short/wide images with small footprint → likely shoes.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    h, w = image.shape[:2]
    aspect_ratio = h / w  # > 1 means portrait

    # Convert to grayscale and threshold to find clothing region
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # Find vertical center of mass of clothing pixels
    moments = cv2.moments(binary)
    if moments["m00"] == 0:
        return ClothingCategory.UNKNOWN

    cy = moments["m01"] / moments["m00"]  # vertical center of mass
    relative_cy = cy / h  # 0 = top, 1 = bottom

    if aspect_ratio < 0.6:
        # Very wide image → likely shoes laid flat
        return ClothingCategory.SHOES
    elif aspect_ratio > 2.0:
        # Very tall and narrow → likely a dress or outerwear
        return ClothingCategory.DRESS
    elif relative_cy < 0.45:
        return ClothingCategory.TOP
    elif relative_cy >= 0.45:
        return ClothingCategory.BOTTOM

    return ClothingCategory.UNKNOWN


def classify_clothing(image_bytes: bytes, user_label: str = "") -> dict:
    """
    Main entry point. Combines label hint + vision classification.

    Returns:
        {
            "category": "top",
            "confidence": "label" | "vision" | "unknown",
        }
    """
    if user_label:
        label_result = classify_by_label(user_label)
        if label_result != ClothingCategory.UNKNOWN:
            return {"category": label_result.value, "confidence": "label"}

    vision_result = classify_by_vision(image_bytes)
    return {
        "category": vision_result.value,
        "confidence": "vision" if vision_result != ClothingCategory.UNKNOWN else "unknown",
    }

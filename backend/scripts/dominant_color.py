"""
dominant_color.py
Extracts the top-N dominant colors from a clothing image using KMeans clustering.
Returns colors as hex strings and their percentage presence in the image.
"""

import cv2
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
from collections import Counter
import io


def remove_background(image: np.ndarray) -> np.ndarray:
    """
    Simple background removal using GrabCut.
    Assumes clothing is roughly centered in the image.
    """
    mask = np.zeros(image.shape[:2], np.uint8)
    h, w = image.shape[:2]
    # Define a rect that covers the center 80% of the image
    rect = (int(w * 0.1), int(h * 0.1), int(w * 0.8), int(h * 0.8))
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype("uint8")
    return image * mask2[:, :, np.newaxis]


def rgb_to_hex(rgb: tuple) -> str:
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def extract_dominant_colors(
    image_bytes: bytes,
    n_colors: int = 5,
    remove_bg: bool = True,
) -> list[dict]:
    """
    Given raw image bytes, returns a list of dominant colors sorted by prevalence.

    Returns:
        [
            {"hex": "#3a5f8a", "rgb": [58, 95, 138], "percentage": 42.3},
            ...
        ]
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    if remove_bg:
        try:
            image = remove_background(image)
        except Exception:
            pass  # Fall back to full image if GrabCut fails

    # Flatten pixels and remove near-black pixels (background residue)
    pixels = image.reshape(-1, 3)
    pixels = pixels[~np.all(pixels < 15, axis=1)]  # drop near-black

    if len(pixels) < n_colors:
        return []

    kmeans = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
    kmeans.fit(pixels)

    labels = kmeans.labels_
    centers = kmeans.cluster_centers_
    counter = Counter(labels)
    total = sum(counter.values())

    result = []
    for cluster_id, count in counter.most_common():
        rgb = centers[cluster_id].astype(int)
        result.append(
            {
                "hex": rgb_to_hex(rgb),
                "rgb": rgb.tolist(),
                "percentage": round(count / total * 100, 2),
            }
        )
    return result


def get_primary_color(image_bytes: bytes) -> dict:
    """Returns just the single most dominant color."""
    colors = extract_dominant_colors(image_bytes, n_colors=3)
    return colors[0] if colors else {"hex": "#888888", "rgb": [136, 136, 136], "percentage": 100.0}

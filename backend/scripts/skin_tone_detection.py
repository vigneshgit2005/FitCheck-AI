"""
skin_tone_detection.py
Detects skin tone from a user selfie using MediaPipe Face Mesh.
Samples forehead and cheek regions, averages the pixel values, and
maps them to a Fitzpatrick scale type + hex color.
"""

import cv2
import numpy as np
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

# Fitzpatrick scale ranges (based on lightness in LAB color space)
FITZPATRICK_SCALE = [
    {"type": 1, "label": "Very light",        "L_range": (75, 100)},
    {"type": 2, "label": "Light",             "L_range": (65, 75)},
    {"type": 3, "label": "Medium light",      "L_range": (55, 65)},
    {"type": 4, "label": "Medium",            "L_range": (45, 55)},
    {"type": 5, "label": "Medium dark",       "L_range": (35, 45)},
    {"type": 6, "label": "Dark",              "L_range": (0,  35)},
]

# Landmark indices for skin sampling regions
FOREHEAD_LANDMARKS = [10, 338, 297, 332, 284]
LEFT_CHEEK_LANDMARKS = [50, 101, 118, 117, 116]
RIGHT_CHEEK_LANDMARKS = [280, 330, 347, 346, 345]


def _sample_region(image: np.ndarray, landmarks, lm_list: list[int]) -> np.ndarray:
    h, w = image.shape[:2]
    pts = np.array(
        [(int(lm_list[i].x * w), int(lm_list[i].y * h)) for i in landmarks],
        dtype=np.int32,
    )
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(mask, [pts], 255)
    pixels = image[mask == 255]
    return pixels


def rgb_to_hex(rgb: tuple) -> str:
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def classify_fitzpatrick(lab_L: float) -> dict:
    for entry in FITZPATRICK_SCALE:
        lo, hi = entry["L_range"]
        if lo <= lab_L <= hi:
            return entry
    return FITZPATRICK_SCALE[-1]


def detect_skin_tone(image_bytes: bytes) -> dict:
    """
    Detects skin tone from image bytes.

    Returns:
        {
            "hex": "#c68642",
            "rgb": [198, 134, 66],
            "fitzpatrick_type": 4,
            "fitzpatrick_label": "Medium",
            "lab_L": 58.3
        }
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return {
            "hex": "#c68642",
            "rgb": [198, 134, 66],
            "fitzpatrick_type": 4,
            "fitzpatrick_label": "Medium",
            "lab_L": 55.0,
            "error": "No face detected — using default skin tone",
        }

    lm = results.multi_face_landmarks[0].landmark

    all_pixels = []
    for region in [FOREHEAD_LANDMARKS, LEFT_CHEEK_LANDMARKS, RIGHT_CHEEK_LANDMARKS]:
        pixels = _sample_region(image_rgb, region, lm)
        if len(pixels) > 0:
            all_pixels.append(pixels)

    if not all_pixels:
        return {"error": "Could not sample skin region"}

    skin_pixels = np.vstack(all_pixels)
    avg_rgb = skin_pixels.mean(axis=0).astype(int)

    # Convert to LAB to get lightness
    pixel_bgr = np.uint8([[avg_rgb[::-1]]])  # RGB → BGR for OpenCV
    lab = cv2.cvtColor(pixel_bgr, cv2.COLOR_BGR2LAB)[0][0]
    L_normalized = lab[0] / 255.0 * 100  # OpenCV LAB L is 0-255

    fitzpatrick = classify_fitzpatrick(L_normalized)

    return {
        "hex": rgb_to_hex(tuple(avg_rgb)),
        "rgb": avg_rgb.tolist(),
        "fitzpatrick_type": fitzpatrick["type"],
        "fitzpatrick_label": fitzpatrick["label"],
        "lab_L": round(L_normalized, 2),
    }

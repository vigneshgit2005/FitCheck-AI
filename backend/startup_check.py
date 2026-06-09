"""
startup_check.py
Verifies all dependencies and directories before the server starts.
Run with: python startup_check.py
"""

import sys
import importlib

REQUIRED = [
    ("fastapi",               "FastAPI"),
    ("uvicorn",               "Uvicorn"),
    ("cv2",                   "OpenCV"),
    ("mediapipe",             "MediaPipe"),
    ("chromadb",              "ChromaDB"),
    ("sentence_transformers", "sentence-transformers"),
    ("sklearn",               "scikit-learn"),
    ("PIL",                   "Pillow"),
]

print("\n  FitCheck.ai — Dependency check\n")
all_ok = True
for module, label in REQUIRED:
    try:
        importlib.import_module(module)
        print(f"  ✓  {label}")
    except ImportError:
        print(f"  ✗  {label} — missing! Run: pip install -r requirements.txt")
        all_ok = False

print()
if all_ok:
    print("  All dependencies present. Ready to start!\n")
    print("  Run:  bash start.sh")
else:
    print("  Some dependencies are missing. Run:\n")
    print("    cd backend && pip install -r requirements.txt\n")
    sys.exit(1)

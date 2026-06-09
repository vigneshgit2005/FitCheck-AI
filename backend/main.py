"""
main.py — FitCheck.ai unified server
Serves the React frontend AND the FastAPI backend from a single port.

Architecture:
  http://localhost:8000/          → React SPA (built files from static/dist)
  http://localhost:8000/api/*     → FastAPI routes
  http://localhost:8000/uploads/* → Uploaded clothing photos

On startup:
  - ChromaDB is automatically initialized and verified
  - Upload directory is created if missing
  - A health ping is logged so you know it's ready
"""

import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uuid

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
STATIC_DIR  = BASE_DIR / "static" / "dist"          # React build output
UPLOAD_DIR  = BASE_DIR / "data" / "uploads"
CHROMA_DIR  = BASE_DIR / "data" / "chromadb"

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fitcheck")

# ── Startup / shutdown ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info("  FitCheck.ai is starting…")

    # Create data directories
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    log.info(f"  ✓ Data directories ready")

    # Initialize ChromaDB connection
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        # Verify it works by listing collections
        _ = client.list_collections()
        log.info(f"  ✓ ChromaDB initialized at {CHROMA_DIR}")
    except Exception as e:
        log.error(f"  ✗ ChromaDB failed: {e}")

    # Load sentence-transformer model (warm up)
    try:
        from recommendation.embeddings import _get_model
        _get_model()
        log.info("  ✓ Embedding model loaded")
    except Exception as e:
        log.warning(f"  ⚠ Embedding model not loaded: {e}")

    # Check if frontend build exists
    if STATIC_DIR.exists():
        log.info(f"  ✓ Frontend build found → serving at /")
    else:
        log.warning(f"  ⚠ No frontend build found. Run: npm run build (inside frontend/)")

    log.info("  ✓ Server ready → http://localhost:8000")
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    log.info("FitCheck.ai shutting down. Goodbye!")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FitCheck.ai",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# In-memory user profile store
user_profiles: dict[str, dict] = {}


# ── Helpers ────────────────────────────────────────────────────────────────────
async def read_upload(file: UploadFile) -> bytes:
    return await file.read()

def save_upload(image_bytes: bytes, filename: str) -> str:
    safe_name = f"{uuid.uuid4()}_{filename}"
    dest = UPLOAD_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(image_bytes)
    return safe_name


# ── API Routes (all prefixed /api/) ───────────────────────────────────────────

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "FitCheck.ai",
        "chromadb": str(CHROMA_DIR),
        "uploads": str(UPLOAD_DIR),
        "frontend": STATIC_DIR.exists(),
    }

@app.post("/api/onboard")
async def onboard(
    user_id:   str = Form(...),
    gender:    str = Form(...),
    body_type: str = Form(...),
    selfie:    UploadFile = File(...),
):
    from scripts.skin_tone_detection import detect_skin_tone
    image_bytes = await read_upload(selfie)
    skin_tone = detect_skin_tone(image_bytes)
    user_profiles[user_id] = {
        "user_id": user_id, "gender": gender,
        "body_type": body_type, "skin_tone": skin_tone,
    }
    return {**user_profiles[user_id], "message": "Profile saved"}

@app.post("/api/wardrobe/add")
async def add_to_wardrobe(
    user_id:      str = Form(...),
    label:        str = Form(""),
    occasion_tags:str = Form("casual"),
    style_tags:   str = Form(""),
    pattern:      str = Form("solid"),
    image:        UploadFile = File(...),
):
    from scripts.dominant_color import get_primary_color, extract_dominant_colors
    from scripts.clothing_classifier import classify_clothing
    from recommendation.embeddings import embed_clothing_item
    from recommendation.vectorstore import add_wardrobe_item

    image_bytes = await read_upload(image)
    filename = save_upload(image_bytes, image.filename or "item.jpg")

    primary_color  = get_primary_color(image_bytes)
    classification = classify_clothing(image_bytes, user_label=label)

    features = {
        "category":    classification["category"],
        "color_hex":   primary_color["hex"],
        "color_name":  label if label else primary_color["hex"],
        "pattern":     pattern,
        "occasion_tags": [t.strip() for t in occasion_tags.split(",") if t.strip()],
        "style_tags":    [t.strip() for t in style_tags.split(",") if t.strip()],
    }

    embedding = embed_clothing_item(features)
    item_id   = add_wardrobe_item(user_id, embedding, features, filename)

    return {
        "item_id": item_id, "filename": filename, "features": features,
        "classification_confidence": classification["confidence"],
        "dominant_colors": extract_dominant_colors(image_bytes, n_colors=3),
        "message": "Item added to wardrobe",
    }

@app.get("/api/wardrobe/{user_id}")
def get_wardrobe(user_id: str):
    from recommendation.vectorstore import list_wardrobe_items, get_wardrobe_count
    return {
        "user_id": user_id,
        "total_items": get_wardrobe_count(user_id),
        "items": list_wardrobe_items(user_id),
    }

@app.delete("/api/wardrobe/{user_id}/{item_id}")
def remove_wardrobe_item(user_id: str, item_id: str):
    from recommendation.vectorstore import delete_wardrobe_item
    if not delete_wardrobe_item(user_id, item_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item removed", "item_id": item_id}

@app.post("/api/recommend")
async def recommend_outfit(
    user_id:          str = Form(...),
    occasion:         str = Form(...),
    style_preference: str = Form(""),
):
    from recommendation.embeddings import embed_query
    from recommendation.vectorstore import query_wardrobe
    from recommendation.outfit_builder import build_outfits

    profile       = user_profiles.get(user_id)
    skin_tone_hex = profile["skin_tone"]["hex"] if profile else "#c68642"
    query_emb     = embed_query(occasion, skin_tone_hex, style_preference)

    tops    = query_wardrobe(user_id, query_emb, category_filter="top",    n_results=6)
    bottoms = query_wardrobe(user_id, query_emb, category_filter="bottom", n_results=6)
    shoes   = query_wardrobe(user_id, query_emb, category_filter="shoes",  n_results=6)

    outfits = build_outfits(tops, bottoms, shoes, skin_tone_hex, occasion, max_combos=5)
    return {
        "user_id": user_id, "occasion": occasion,
        "skin_tone": skin_tone_hex,
        "total_outfits": len(outfits), "outfits": outfits,
    }

@app.get("/api/profile/{user_id}")
def get_profile(user_id: str):
    profile = user_profiles.get(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please onboard first.")
    return profile


# ── Serve React SPA (must be LAST) ────────────────────────────────────────────
# All non-API routes return index.html so React Router handles navigation.

if STATIC_DIR.exists():
    # Serve React static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Let /api/* fall through to the routes above
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        # Serve any existing static file directly
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Everything else → index.html (React Router takes over)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/", include_in_schema=False)
    async def no_frontend():
        return JSONResponse({
            "message": "Frontend not built yet. Run: bash start.sh",
            "api_docs": "http://localhost:8000/api/docs",
        })

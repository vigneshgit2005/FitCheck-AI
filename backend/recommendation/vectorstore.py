"""
vectorstore.py
ChromaDB wrapper for FitCheck.ai wardrobe item storage and retrieval.

Collections:
  - wardrobe_{user_id}  →  one collection per user, items stored with metadata

Each document in ChromaDB:
  id:        unique item ID (UUID)
  embedding: 387-dim vector (text + color)
  metadata:  {
                category, color_hex, color_name, pattern,
                occasion_tags (comma-separated), style_tags,
                image_filename, user_id
             }
  document:  human-readable description string
"""

import chromadb
from chromadb.config import Settings
import uuid
import os

CHROMA_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chromadb")

_client = None


def _get_client() -> chromadb.Client:
    global _client
    if _client is None:
        os.makedirs(CHROMA_DB_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return _client


def _get_collection(user_id: str):
    client = _get_client()
    collection_name = f"wardrobe_{user_id}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},  # cosine similarity
    )


# ── Add ────────────────────────────────────────────────────────────────────────

def add_wardrobe_item(
    user_id: str,
    embedding: list[float],
    features: dict,
    image_filename: str,
) -> str:
    """
    Adds a clothing item to the user's wardrobe collection in ChromaDB.

    Returns the item ID.
    """
    collection = _get_collection(user_id)
    item_id = str(uuid.uuid4())

    metadata = {
        "user_id": user_id,
        "category": features.get("category", "unknown"),
        "color_hex": features.get("color_hex", "#888888"),
        "color_name": features.get("color_name", ""),
        "pattern": features.get("pattern", "solid"),
        "occasion_tags": ",".join(features.get("occasion_tags", [])),
        "style_tags": ",".join(features.get("style_tags", [])),
        "image_filename": image_filename,
    }

    description = (
        f"{metadata['category']} in {metadata['color_name'] or metadata['color_hex']} "
        f"suitable for {metadata['occasion_tags']} ({metadata['style_tags']} style)"
    )

    collection.add(
        ids=[item_id],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[description],
    )

    return item_id


# ── Query ──────────────────────────────────────────────────────────────────────

def query_wardrobe(
    user_id: str,
    query_embedding: list[float],
    category_filter: str | None = None,
    n_results: int = 10,
) -> list[dict]:
    """
    Retrieves the most similar wardrobe items for a given query embedding.

    Args:
        user_id: The user whose wardrobe to search.
        query_embedding: The 387-dim query vector.
        category_filter: Optional category to restrict results ("top", "bottom", "shoes").
        n_results: Max items to return.

    Returns:
        List of item dicts with metadata + similarity distance.
    """
    collection = _get_collection(user_id)

    where = {"category": {"$eq": category_filter}} if category_filter else None

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, collection.count()),
            where=where,
            include=["metadatas", "documents", "distances"],
        )
    except Exception:
        return []

    items = []
    for i, item_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        items.append(
            {
                "id": item_id,
                "category": meta.get("category"),
                "color_hex": meta.get("color_hex"),
                "color_name": meta.get("color_name"),
                "pattern": meta.get("pattern"),
                "occasion_tags": meta.get("occasion_tags", "").split(","),
                "style_tags": meta.get("style_tags", "").split(","),
                "image_filename": meta.get("image_filename"),
                "description": results["documents"][0][i],
                "similarity_score": round(1 - results["distances"][0][i], 4),
            }
        )
    return items


# ── Delete ─────────────────────────────────────────────────────────────────────

def delete_wardrobe_item(user_id: str, item_id: str) -> bool:
    """Deletes a single item from the user's wardrobe."""
    try:
        collection = _get_collection(user_id)
        collection.delete(ids=[item_id])
        return True
    except Exception:
        return False


def get_wardrobe_count(user_id: str) -> int:
    """Returns total number of items in a user's wardrobe."""
    try:
        collection = _get_collection(user_id)
        return collection.count()
    except Exception:
        return 0


def list_wardrobe_items(user_id: str) -> list[dict]:
    """Returns all items in a user's wardrobe (no similarity ranking)."""
    try:
        collection = _get_collection(user_id)
        results = collection.get(include=["metadatas", "documents"])
        items = []
        for i, item_id in enumerate(results["ids"]):
            meta = results["metadatas"][i]
            items.append(
                {
                    "id": item_id,
                    "category": meta.get("category"),
                    "color_hex": meta.get("color_hex"),
                    "color_name": meta.get("color_name"),
                    "occasion_tags": meta.get("occasion_tags", "").split(","),
                    "image_filename": meta.get("image_filename"),
                    "description": results["documents"][i],
                }
            )
        return items
    except Exception:
        return []

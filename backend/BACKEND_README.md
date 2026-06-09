# FitCheck.ai — Backend Setup

## Requirements
- Python 3.11+
- pip

## Install

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run the API server

```bash
uvicorn main:app --reload --port 8000
```

API will be available at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/onboard` | Save user profile + detect skin tone from selfie |
| POST | `/wardrobe/add` | Upload clothing item → extract features → store in ChromaDB |
| GET | `/wardrobe/{user_id}` | List all wardrobe items |
| DELETE | `/wardrobe/{user_id}/{item_id}` | Remove a clothing item |
| POST | `/recommend` | Get outfit combos for an occasion |
| GET | `/profile/{user_id}` | Get user body profile |
| GET | `/health` | Health check |

---

## How it works

1. **User onboards** → sends selfie + gender + body type → skin tone extracted via MediaPipe
2. **User uploads clothes** → CV extracts dominant color → NLP builds style tags → item vectorized → stored in ChromaDB
3. **User requests outfit** → query vector built from occasion + skin tone → ChromaDB returns top candidates per category → outfit builder ranks combos

---

## Project structure

```
backend/
├── main.py                        ← FastAPI app + all routes
├── requirements.txt
├── scripts/
│   ├── dominant_color.py          ← OpenCV KMeans color extraction
│   ├── skin_tone_detection.py     ← MediaPipe + Fitzpatrick scale
│   └── clothing_classifier.py    ← Category detection (top/bottom/shoes)
├── recommendation/
│   ├── embeddings.py              ← sentence-transformers + color → vector
│   ├── vectorstore.py             ← ChromaDB read/write operations
│   └── outfit_builder.py         ← Combo ranking + color harmony scoring
└── data/
    ├── chromadb/                  ← ChromaDB persistent storage (auto-created)
    └── uploads/                   ← Uploaded clothing images (auto-created)
```

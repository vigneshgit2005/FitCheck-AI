# FitCheck.AI

> Your personal AI style assistant — outfit recommendations from your own wardrobe, matched to your skin tone and occasion.

---

## What it does

Upload your clothes once. Tell FitCheck.ai where you're going. Get outfit combinations — top + bottom + shoes — picked from your actual wardrobe, scored for color harmony and skin tone compatibility.

**How it works under the hood:**

1. **Selfie → skin tone** — MediaPipe detects your face, samples forehead and cheek pixels, maps to Fitzpatrick scale
2. **Photo → clothing features** — OpenCV KMeans extracts dominant colors; a vision + label classifier detects category (top / bottom / shoes / dress / outerwear)
3. **Features → vectors** — `sentence-transformers` embeds occasion tags and style labels into a 387-dim vector stored in ChromaDB
4. **Occasion → outfits** — query vector finds the closest items per category; outfit builder ranks combos by vector similarity + skin compatibility + color harmony + occasion match

---

## Project structure

```
fitcheck-ai/
├── backend/                        # FastAPI + Python ML stack
│   ├── main.py                     # All API routes
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── scripts/
│   │   ├── dominant_color.py       # OpenCV KMeans color extraction
│   │   ├── skin_tone_detection.py  # MediaPipe + Fitzpatrick scale
│   │   └── clothing_classifier.py  # top / bottom / shoes detection
│   ├── recommendation/
│   │   ├── embeddings.py           # features → 387-dim vector
│   │   ├── vectorstore.py          # ChromaDB read/write
│   │   └── outfit_builder.py       # combo ranking + scoring
│   └── data/                       # auto-created at runtime
│       ├── chromadb/               # vector store (persisted)
│       └── uploads/                # clothing photos
├── frontend/                       # React + Vite + Tailwind
│   ├── src/
│   │   ├── main.jsx                # entry point
│   │   ├── App.jsx                 # routing + nav
│   │   ├── pages/
│   │   │   ├── Onboard.jsx         # profile + skin tone setup
│   │   │   ├── Wardrobe.jsx        # upload + manage clothes
│   │   │   └── Recommend.jsx       # occasion → outfit results
│   │   └── utils/api.js            # axios calls to backend
│   ├── Dockerfile
│   └── nginx.conf                  # SPA routing + API proxy
├── tests/
│   ├── conftest.py                 # synthetic image fixtures
│   ├── test_cv.py                  # 29 CV unit tests
│   ├── test_recommendation.py      # 35 recommendation unit tests
│   └── test_api.py                 # 14 end-to-end API tests
├── docker-compose.yml              # run everything with one command
├── .env.example                    # environment variable template
└── pytest.ini
```

---

## Quick start — Docker (recommended)

**Requirements:** Docker + Docker Compose

```bash
# 1. Clone the repo
git clone https://github.com/your-username/fitcheck-ai.git
cd fitcheck-ai

# 2. Set up environment
cp .env.example .env

# 3. Build and start
docker-compose up --build
```

App is live at **http://localhost**  

To stop:
```bash
docker-compose down
```

Your wardrobe data and uploaded photos persist across restarts via Docker named volumes.

---

## Local development setup

### Backend

**Requirements:** Python 3.11+

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn main:app --reload --port 8000
```

API available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### Frontend

**Requirements:** Node.js 20+

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api/* to backend:8000)
npm run dev
```

App available at: **http://localhost:5173**

> Both backend and frontend must be running together for the full app to work.

---

## API reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/onboard` | Save user profile + detect skin tone from selfie |
| `POST` | `/wardrobe/add` | Upload clothing item → extract features → store in ChromaDB |
| `GET` | `/wardrobe/{user_id}` | List all wardrobe items |
| `DELETE` | `/wardrobe/{user_id}/{item_id}` | Remove a clothing item |
| `POST` | `/recommend` | Get outfit combos for an occasion |
| `GET` | `/profile/{user_id}` | Get user body profile |

### Example: onboard a user

```bash
curl -X POST http://localhost:8000/onboard \
  -F "user_id=priya" \
  -F "gender=female" \
  -F "body_type=athletic" \
  -F "selfie=@/path/to/selfie.jpg"
```

### Example: add a clothing item

```bash
curl -X POST http://localhost:8000/wardrobe/add \
  -F "user_id=priya" \
  -F "label=navy blue kurta" \
  -F "occasion_tags=wedding,festival" \
  -F "pattern=solid" \
  -F "image=@/path/to/kurta.jpg"
```

### Example: get outfit recommendations

```bash
curl -X POST http://localhost:8000/recommend \
  -F "user_id=priya" \
  -F "occasion=wedding" \
  -F "style_preference=traditional"
```

---

## Running tests

```bash
cd backend

# Install test dependencies
pip install -r ../tests/requirements-test.txt

# Run all 78 tests
pytest ../tests/ -v

# Run by module
pytest ../tests/test_cv.py -v             # 29 CV unit tests
pytest ../tests/test_recommendation.py -v # 35 recommendation tests
pytest ../tests/test_api.py -v            # 14 API integration tests
```

Tests use synthetic in-memory images (no real photos needed) and redirect ChromaDB to a temp directory — production data is never touched.

---

## Outfit scoring

Each recommended outfit combo is scored across four factors:

| Factor | Weight | What it checks |
|--------|--------|----------------|
| Vector similarity | 35% | How closely the item's embedding matches the occasion query |
| Skin compatibility | 25% | Whether the clothing color suits the detected skin tone |
| Color harmony | 20% | Whether top + bottom + shoes colors work well together |
| Occasion match | 20% | Whether the item is tagged for the requested occasion |

---

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `development` or `production` |
| `SECRET_KEY` | — | Random secret for future auth (generate with `openssl rand -hex 32`) |
| `CHROMA_DB_PATH` | `/app/data/chromadb` | Where ChromaDB stores its data |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | sentence-transformers model name |
| `ALLOWED_ORIGINS` | `http://localhost` | Comma-separated CORS origins |
| `MAX_UPLOAD_MB` | `20` | Max clothing photo size in MB |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| Computer vision | OpenCV, MediaPipe |
| NLP / embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Vector database | ChromaDB (cosine similarity) |
| Containerisation | Docker, docker-compose, nginx |
| Testing | pytest, httpx, pytest-asyncio |

---


---

## License

MIT

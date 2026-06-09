# FitCheck.ai — Makefile
# Usage: make <command>

.PHONY: start build dev clean reset help

## start  → build frontend + launch server (default)
start:
	@bash start.sh

## build  → build React frontend only
build:
	@cd frontend && npm install --silent && npm run build
	@echo "✓ Frontend built → backend/static/dist/"

## dev    → run backend + frontend dev servers simultaneously (hot reload)
dev:
	@echo "Starting backend and frontend dev servers..."
	@cd backend && source venv/bin/activate 2>/dev/null || true && \
	  uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
	@cd frontend && npm run dev

## clean  → remove build artifacts and cache
clean:
	@rm -rf backend/static/dist
	@rm -rf frontend/node_modules/.vite
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Cleaned build artifacts"

## reset  → clear all user data (ChromaDB + uploads) — WARNING: irreversible
reset:
	@read -p "This deletes ALL wardrobe data. Are you sure? (y/N) " yn; \
	  [ "$$yn" = "y" ] && rm -rf backend/data/chromadb backend/data/uploads \
	  && echo "✓ Data cleared" || echo "Cancelled"

## test   → run the integration test suite
test:
	@cd backend && source venv/bin/activate 2>/dev/null || true && \
	  pytest ../tests/ -v

## help   → show this menu
help:
	@grep -E '^## ' Makefile | sed 's/## /  make /g'

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FitCheck.ai — unified start script (WSL + Mac + Linux compatible)
# ─────────────────────────────────────────────────────────────────────────────
 
set -e
 
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
 
log()  { echo -e "${CYAN}▸ $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
fail() { echo -e "${RED}✗ $1${RESET}"; exit 1; }
 
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}        FitCheck.ai — Starting up          ${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
 
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
ACTIVATE="$VENV_DIR/bin/activate"
 
# ── 1. Python virtual environment ──────────────────────────────────────────────
log "Checking Python environment…"
 
# If venv exists but was created by Windows Python (no bin/activate), delete it
if [ -d "$VENV_DIR" ] && [ ! -f "$ACTIVATE" ]; then
  warn "Found a Windows-created venv (no bin/activate). Removing and recreating…"
  rm -rf "$VENV_DIR"
fi
 
if [ ! -d "$VENV_DIR" ]; then
  log "Creating virtual environment…"
  python3 -m venv "$VENV_DIR" || fail "python3 -m venv failed. Is Python 3.11+ installed?"
  ok "Virtual environment created"
fi
 
source "$ACTIVATE"
ok "Virtual environment active"
 
# ── 2. Python dependencies ─────────────────────────────────────────────────────
log "Installing Python dependencies…"
pip install -q --upgrade pip
pip install -q -r "$BACKEND_DIR/requirements.txt"
ok "Python dependencies ready"
 
# ── 3. Node dependencies ───────────────────────────────────────────────────────
log "Checking Node dependencies…"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  log "Installing Node dependencies (first run — may take a minute)…"
  cd "$FRONTEND_DIR" && npm install --silent
  ok "Node dependencies installed"
else
  ok "Node dependencies already installed"
fi
 
# ── 4. Build React frontend ────────────────────────────────────────────────────
log "Building React frontend…"
cd "$FRONTEND_DIR"
npm run build
ok "Frontend built → backend/static/dist/"
 
# ── 5. Create data directories ─────────────────────────────────────────────────
mkdir -p "$BACKEND_DIR/data/chromadb"
mkdir -p "$BACKEND_DIR/data/uploads"
ok "Data directories ready"
 
# ── 6. Launch server ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}  ✓ FitCheck.ai → http://localhost:8000    ${RESET}"
echo -e "${GREEN}  ✓ API docs    → http://localhost:8000/api/docs${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
 
# Auto-open browser (works on Mac, Linux, WSL)
(sleep 2 && {
  if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:8000
  elif command -v open &>/dev/null; then
    open http://localhost:8000
  elif command -v cmd.exe &>/dev/null; then
    cmd.exe /c start http://localhost:8000
  fi
}) &
 
cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload \
  --reload-dir scripts \
  --reload-dir recommendation \
  --log-level info
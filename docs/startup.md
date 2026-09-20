# Cheffify startup

Use the same process every time to bring the app up for local and LAN/mobile testing.

## 1) Frontend environment

The frontend uses a `.env` file in the frontend directory:

```env
VITE_BACKEND_URL=http://192.168.1.76:8000
```

This makes uploaded recipe images and API calls point at the app server on the LAN instead of `localhost`.

## 2) Start both services

From the project root:

```bash
bash scripts/start-dev.sh
```

This script will:

- start the FastAPI backend at `http://0.0.0.0:8000`
- start the Vite frontend at `http://0.0.0.0:5174`
- use `VITE_BACKEND_URL=http://192.168.1.76:8000`
- write logs to `.logs/backend.log` and `.logs/frontend.log`

## 3) Open the app

- Local: `http://localhost:5174/`
- LAN/mobile: `http://192.168.1.76:5174/`

## 4) Manual startup fallback

If you need to run each service directly:

```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
cd frontend
VITE_BACKEND_URL=http://192.168.1.76:8000 npm run dev -- --host 0.0.0.0 --port 5174
```

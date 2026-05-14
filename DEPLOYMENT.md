# AeriSeg SIEM Deployment Guide

This document outlines the steps to deploy the **AeriSeg Segmented SIEM** on a production server.

## 1. System Requirements
- **OS**: Linux (Ubuntu 22.04 LTS recommended) or Windows Server.
- **Python**: 3.9+ 
- **Node.js**: 18+ (with npm)
- **Memory**: 4GB RAM minimum (8GB recommended for ingestion).

## 2. Infrastructure Setup

### Clone and Environment
```bash
git clone <your-repo-url>
cd siem
```

### Backend Setup (Python)
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Initialize the database:
   The system automatically runs migrations on startup. Ensure the directory is writable.

### Frontend Setup (React + Tailwind v4)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build for production:
   ```bash
   npm run build
   ```
   This creates a `dist` folder with optimized static assets.

## 3. Production Serving

### Option A: Manual (Quick Start)
Run both components simultaneously from the root:
```bash
python start.py
```

### Option B: Professional (Nginx + Gunicorn)
1. **Backend**: Use Gunicorn with Uvicorn workers.
   ```bash
   cd backend
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
   ```
2. **Frontend**: Use Nginx to serve the `dist` folder and proxy API requests.
   ```nginx
   server {
       listen 80;
       server_name aeriseg.yourdomain.com;

       location / {
           root /path/to/siem/frontend/dist;
           try_files $uri /index.html;
       }

       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /ws {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
       }
   }
   ```

## 4. Key Files
- `start.py`: Master startup script (Development).
- `backend/app.db`: SQLite database (Backup this file!).
- `backend/app/main.py`: Main API entry point.
- `frontend/dist/`: Production frontend assets.

## 5. Security Notes
- Change the default admin password in the `users` table.
- Ensure ports `8000` and `5173` (or `80`) are restricted via firewall.
- In production, set `DEBUG=False` in your environment variables.

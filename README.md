# RescueOS AI

Reusable emergency response platform template for hackathons. Built with **Next.js**, **FastAPI**, and generic **AI wrappers** — swap prompts and modules per problem statement.

🚀 **Live Demo:** [https://rescue-ai-ecosystem.vercel.app/](https://rescue-ai-ecosystem.vercel.app/)


## Features

- **Flight Search & Rescue** - Real-time aircraft tracking with signal loss simulation
- **AI-Powered Analysis** - Intelligent crash scenario modeling and search zone estimation
- **Live Data Integration** - Weather, elevation, sunrise/sunset times (Open-Meteo API)
- **Interactive Maps** - Leaflet-based mapping with custom markers and routes
- **Emergency Services** - Nearby hospitals, police, fire stations integration
- **Drone Vision Analysis** - AI-powered footage analysis for survivor detection
- **Wearable Integration** - Survivor GPS tracking and vitals monitoring
- **Resource Management** - Teams, drones, ambulances, supplies coordination

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** (for frontend)
- **Python** 3.10+ and **pip** (for backend)
- **Git** (for version control)

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# On Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # Windows
# On Linux/Mac: cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Backend will run on [http://localhost:8000](http://localhost:8000)

### Frontend Setup

```bash
cd frontend
npm install
copy .env.local.example .env.local  # Windows
# On Linux/Mac: cp .env.local.example .env.local
npm run dev
```

Frontend will run on [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend (.env)

```env
# AI Provider Configuration (Optional - works with mock data without keys)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
AI_PROVIDER=openai  # or gemini

# API Configuration
API_HOST=localhost
API_PORT=8000
```

### Frontend (.env.local)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Map Tile Provider (default uses OpenStreetMap)
NEXT_PUBLIC_MAP_TILE_PROVIDER=dark
```

## Modules (RescueOS Demo)

| Route | Module | Description |
|-------|--------|-------------|
| `/dashboard` | Command Center | Map, metrics, AI recommendations |
| `/search` | Missing Aircraft | Search zone estimation with flight simulation |
| `/drones` | Drone Vision | Footage upload + AI analysis |
| `/wearables` | Survivor Tracking | GPS & vitals dashboard |
| `/planner` | Rescue Planner | AI decision support |
| `/resources` | Resource Manager | Teams, drones, ambulances, supplies |

## FRAME Checklist

- **F**oundation — Next.js + FastAPI + shadcn/ui ✓
- **R**eusable components — MetricCard, RescueMap, UploadBox, AIRecommendationCard ✓
- **A**PI wrappers — AI service, weather, vision, resources ✓
- **M**odules — 6 demo pages ready to customize ✓
- **E**vent-specific — Add your hackathon logic during the event

## AI Configuration

Works **without API keys** using realistic mock data. For live AI:

```env
OPENAI_API_KEY=sk-...
# or
GEMINI_API_KEY=...
AI_PROVIDER=openai  # or gemini
```

## Live Data APIs

The application uses free APIs that don't require authentication:

- **Weather & Elevation** - Open-Meteo API (no key required)
- **Maps** - OpenStreetMap (no key required)
- **Emergency Services** - Overpass API (no key required)

**Note:** METAR and ADS-B flight tracking features are disabled due to CORS restrictions. These would require a backend proxy for production use.

## Project Structure

```
RescueAI ecosystem/
├── frontend/          # Next.js + Tailwind + shadcn
│   ├── src/
│   │   ├── app/(app)/ # Dashboard modules
│   │   ├── components/
│   │   │   ├── maps/  # Leaflet map components
│   │   │   ├── search/ # Search-specific components
│   │   │   └── ui/    # shadcn/ui components
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── weather.ts
│   │       ├── flights.ts
│   │       ├── elevation.ts
│   │       └── metar.ts
│   ├── public/
│   └── package.json
├── backend/           # FastAPI
│   ├── app/
│   │   ├── ai/        # Generic AI service
│   │   ├── apis/      # Weather, maps wrappers
│   │   └── routers/   # API endpoints
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

## Development Workflow

### Starting the Application

1. **Start Backend** (Terminal 1):
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

2. **Start Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

3. **Open Browser**: Navigate to [http://localhost:3000](http://localhost:3000)

### Flight Search Feature

1. Go to `/search` page
2. Select departure and destination airports
3. Click "Start Flight" to begin simulation
4. Press **Space** to trigger signal loss
5. View AI-generated crash scenarios and search zones
6. Right-click on map to manually select crash location

## Hackathon Strategy

During the event, only customize:
1. Prompts in `backend/app/ai/service.py`
2. Mock data in `frontend/src/lib/mock-data.ts`
3. Page-specific logic in `frontend/src/app/(app)/`

Keep the infrastructure. Swap the innovation.

## Troubleshooting

### Backend Issues

- **Port 8000 already in use**: Change port with `--port 8001`
- **Module not found**: Ensure virtual environment is activated
- **API key errors**: Application works with mock data without keys

### Frontend Issues

- **Port 3000 already in use**: Kill process or use different port
- **Module not found**: Run `npm install` again
- **Map not loading**: Check browser console for errors

### Map Rendering Issues

- **White screen during flight**: This is normal for long-distance flights. The map auto-fits to show the full route.
- **Flickering**: Ensure you have a stable internet connection for map tiles.

## Deployment

### GitHub Setup

1. **Initialize Git Repository** (if not already done):
```bash
cd RescueAI ecosystem
git init
git add .
git commit -m "Initial commit"
```

2. **Create GitHub Repository**:
   - Go to [github.com](https://github.com) and create a new repository
   - Copy the repository URL

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Team Collaboration

Your teammates can now:

1. **Clone the repository**:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd RescueAI ecosystem
```

2. **Set up their environment**:
```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
copy .env.example .env

# Frontend  
cd ../frontend
npm install
copy .env.local.example .env.local
```

3. **Start the application** following the Quick Start instructions

### Branching Strategy

This project uses a two-branch workflow:

- **`main`** - Production-ready, stable code. Only merge tested features here.
- **`hackathon`** - Active development branch for hackathon work and experimentation.

```bash
# Switch to hackathon branch for development
git checkout hackathon

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to GitHub
git push origin hackathon

# When ready to deploy to production:
git checkout main
git merge hackathon
git push origin main
```

**For feature branches during hackathon:**
```bash
# Create a feature branch from hackathon
git checkout hackathon
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to GitHub
git push origin feature/your-feature-name

# Merge back to hackathon when done
git checkout hackathon
git merge feature/your-feature-name
```

## License

MIT License - Feel free to use this for your hackathon projects!

## Support

For issues during the hackathon, check:
1. Console errors (F12 in browser)
2. Backend terminal output
3. Frontend terminal output
4. Environment variables are set correctly

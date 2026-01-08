# Phonetics Learning App

A comprehensive Flutter + Python FastAPI application for teaching phonetics to early learners with:
- AI-driven lesson orchestration
- Cartoon animal character animations
- Real-time viseme synchronization
- Student progress tracking with RethinkDB
- Recording submission and feedback

## Project Structure

```
phonetics-app/
├── frontend/               # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── services/
│   └── pubspec.yaml
├── backend/                # Python FastAPI orchestrator
│   ├── app/
│   │   ├── main.py        # FastAPI app
│   │   ├── models/        # Pydantic schemas
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── db/            # RethinkDB connection
│   └── requirements.txt
├── infrastructure/         # DevOps & deployment
│   ├── docker-compose.yml
│   └── jenkins-job-dsl.groovy
├── Jenkinsfile            # CI/CD pipeline
└── docs/                  # Documentation
```

## Quick Start

### Prerequisites
- Flutter 3.0+
- Python 3.8+
- RethinkDB 2.4+
- Docker & Docker Compose
- Git

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your RethinkDB settings
```

3. **Start RethinkDB:**
```bash
# Using Docker (recommended):
docker run -d -p 28015:28015 -p 29015:29015 -p 8080:8080 rethinkdb

# Or install locally: https://rethinkdb.com/docs/install/
```

4. **Run the API server:**
```bash
uvicorn app.main:app --reload --port 8000
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Frontend Setup

1. **Get Flutter dependencies:**
```bash
cd frontend
flutter pub get
```

2. **Update API base URL:**
In `lib/services/api_service.dart`, ensure the `baseUrl` matches your backend:
```dart
final String baseUrl = 'http://127.0.0.1:8000';
```

3. **Run the app:**
```bash
# For iOS (macOS only):
flutter run -d iphone

# For Android:
flutter run -d android

# For web (development):
flutter run -d web
```

## 🎨 Kid-Friendly Graphics System

The app now includes **beautiful, animated SVG graphics** to enhance learning engagement:

### Graphics Features
- **Listen & Choose** 🎵 - Audio activity with animated sound waves
- **Build Word** 🔤 - Letter combination with bouncing blocks
- **Read & Pick** 📖 - Image selection with open book graphic
- **Reward & Celebration** 🏆 - Success celebrations with trophy and stars
- **Progress Plant** 🌱 - Learning growth visualization (seed → flower)

### Quick Links
- 🎨 **Demo Page**: `activity-graphics-demo.html` - Interactive showcase
- 📚 **Full Docs**: `GRAPHICS_DOCUMENTATION.md` - Complete API reference
- 🚀 **Quick Start**: `GRAPHICS_QUICK_START.md` - Parent/teacher guide
- 📝 **Summary**: `GRAPHICS_IMPLEMENTATION_SUMMARY.md` - Implementation details

### Key Features
✅ Pure SVG (no external images)  
✅ Smooth CSS animations  
✅ Responsive on all devices  
✅ Kid-friendly color palette  
✅ <100ms load time  

See [GRAPHICS_DOCUMENTATION.md](GRAPHICS_DOCUMENTATION.md) for complete technical details.

### Docker Compose (Recommended for Development)

Start all services with one command:

```bash
docker-compose up -d
```

This starts:
- **RethinkDB** on port 28015 (admin UI: http://localhost:8080)
- **FastAPI** backend on port 8000 (docs: http://localhost:8000/docs)
- **Volume mounts** for hot-reload development

```bash
# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## API Endpoints

### Lessons
- `GET /api/lesson` - Get random lesson
- `GET /api/lessons` - Get all lessons
- `GET /api/lesson/{phoneme}` - Get lesson by phoneme

### Feedback & Recording
- `POST /api/feedback` - Submit audio recording and get feedback

### Progress
- `GET /api/progression/{user_id}` - Get user progress

### Health
- `POST /api/health` - Health check

See full API documentation at `http://localhost:8000/docs`

## Database Schema (RethinkDB)

### lessons
```json
{
  "id": "lesson_p",
  "phoneme": "/p/",
  "prompt": "Let's pop like a puppy!",
  "audio_url": "https://...",
  "visemes": [{"viseme": "round", "start_ms": 120, "end_ms": 220}],
  "difficulty": 1,
  "created_at": "2024-01-01T...",
  "updated_at": "2024-01-01T..."
}
```

### user_progress
```json
{
  "id": "progress_xxx",
  "user_id": "demo_user",
  "phoneme": "/p/",
  "attempts": 5,
  "best_score": 0.92,
  "last_attempted": "2024-01-01T...",
  "mastered": true
}
```

### recordings
```json
{
  "id": "recording_xxx",
  "user_id": "demo_user",
  "lesson_id": "lesson_p",
  "duration_ms": 2500,
  "file_path": "./uploads/xxx.wav",
  "created_at": "2024-01-01T..."
}
```

## CI/CD with Jenkins

### Setup Jenkins

1. **Install Jenkins plugins:**
   - Pipeline
   - GitHub Integration
   - Docker Pipeline
   - Blue Ocean (UI)

2. **Create pipeline job:**
   - Use the provided `Jenkinsfile`
   - Configure GitHub webhook for automatic triggers

3. **Configure credentials:**
   ```groovy
   withCredentials([
       usernamePassword(credentialsId: 'docker-hub', 
                       usernameVariable: 'DOCKER_USER', 
                       passwordVariable: 'DOCKER_PASS')
   ]) { ... }
   ```

4. **View pipeline:**
   - Jenkins dashboard: http://localhost:8080
   - Blue Ocean UI: http://localhost:8080/blue

### Pipeline Stages

1. **Checkout** - Fetch code from Git
2. **Backend Lint & Test** - Flake8 + Pytest
3. **Frontend Build** - Flutter build & analysis
4. **Backend Build** - Docker image creation
5. **Security Scan** - Bandit security checks
6. **Push Docker Images** - Registry upload (main branch only)
7. **Deploy to Dev** - Docker Compose deployment
8. **Health Check** - Endpoint validation

### View Build Status

```bash
# Via command line
curl http://localhost:8080/job/phonetics-app-pipeline/api/json | jq '.builds[0].result'
```

## Development Workflow

### 1. Feature Branch
```bash
git checkout -b feature/new-feature
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin feature/new-feature
```

### 2. Pull Request
- Push to GitHub and create PR
- Jenkins auto-runs tests
- Merge when pipeline passes

### 3. Auto-Deploy (Main Branch)
- Merge to main
- Jenkins pipeline auto-triggers
- Services deployed to dev environment

## Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
pytest tests/ --cov=app
```

### Frontend Tests
```bash
cd frontend
flutter test
```

### Integration Tests
```bash
# Start all services
docker-compose up -d

# Run integration tests
bash scripts/test-integration.sh
```

## Environment Variables

### Backend (.env)
```
RDB_HOST=localhost
RDB_PORT=28015
RDB_DB=phonetics
PORT=8000
```

### Frontend (lib/services/api_service.dart)
```dart
final String baseUrl = 'http://127.0.0.1:8000';
```

## Troubleshooting

### RethinkDB Connection Error
```bash
# Check RethinkDB is running
docker ps | grep rethinkdb

# Restart RethinkDB
docker restart $(docker ps -q -f ancestor=rethinkdb)
```

### Backend Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn app.main:app --port 8001
```

### Flutter Can't Connect to Backend
1. Check backend is running: `curl http://localhost:8000/docs`
2. Update `api_service.dart` with correct base URL
3. On Android emulator, use `10.0.2.2` instead of `localhost`

### Docker Compose Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter App                          │
│  (Cartoon Animation + Audio Playback + Recording UI)    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     │
┌────────────────────▼────────────────────────────────────┐
│              FastAPI Orchestrator                       │
│  - Lesson Selection (curriculum-aware)                 │
│  - Recording Feedback (ML/Rule-based scoring)          │
│  - Progress Tracking                                   │
└────────────────────┬────────────────────────────────────┘
                     │ Async
                     │
┌────────────────────▼────────────────────────────────────┐
│                  RethinkDB                              │
│  - Lessons & Visemes                                   │
│  - User Progress                                       │
│  - Recordings                                          │
└─────────────────────────────────────────────────────────┘
```

## Future Enhancements

- [ ] Real viseme alignment using Google Cloud Speech-to-Text + forced alignment
- [ ] ML-based pronunciation scoring
- [ ] Rive character animations (swap CustomPainter)
- [ ] Student progress dashboard
- [ ] Classroom teacher management UI
- [ ] Offline mode support
- [ ] Multi-language phonetics support
- [ ] Parent progress notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Push to GitHub
5. Create a Pull Request

## License

MIT License - see LICENSE file

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourrepo/phonetics-app/issues
- Documentation: See `/docs` folder
- Email: support@example.com

## Team

- **Lead Developer**: Your Name
- **Designer**: Designer Name
- **Project Manager**: PM Name

---

**Last Updated**: December 2024

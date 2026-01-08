# Phonetics App - Project Overview

## 📦 Project Structure

```
phonetics-app/
│
├── frontend/                          # Flutter Mobile App
│   ├── lib/
│   │   ├── main.dart                 # App entry & lesson screen
│   │   ├── models/
│   │   │   └── lesson.dart           # Lesson, Viseme, VisemeCue
│   │   ├── screens/
│   │   │   └── lesson_screen.dart    # Main UI screen
│   │   ├── services/
│   │   │   └── api_service.dart      # HTTP client
│   │   └── widgets/
│   │       └── cartoon_animal.dart   # CustomPainter animation
│   ├── pubspec.yaml                  # Dependencies
│   ├── test/                         # Unit tests
│   └── analysis_options.yaml         # Lint rules
│
├── backend/                           # Python FastAPI Server
│   ├── app/
│   │   ├── main.py                   # FastAPI setup & routes
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic models
│   │   ├── routes/
│   │   │   └── lessons.py            # API endpoints
│   │   ├── services/
│   │   │   └── lesson_service.py     # Business logic
│   │   └── db/
│   │       └── connection.py         # RethinkDB setup
│   ├── tests/                        # Unit tests
│   ├── uploads/                      # Audio recordings
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker image
│   ├── .env.example                  # Environment template
│   └── venv/                         # Virtual environment
│
├── infrastructure/                    # DevOps
│   ├── docker-compose.yml            # Local dev environment
│   └── jenkins-job-dsl.groovy       # Jenkins automation
│
├── scripts/                           # Automation scripts
│   ├── setup.sh                      # Initial setup
│   ├── start.sh                      # Start services
│   ├── test.sh                       # Run tests
│   ├── clean.sh                      # Cleanup
│   └── init.sh                       # Make scripts executable
│
├── .github/workflows/                 # GitHub Actions (optional)
│   └── ci.yml                        # CI pipeline
│
├── docs/                              # Documentation
│   ├── SETUP.md                      # Installation guide
│   ├── ARCHITECTURE.md               # System design
│   └── API.md                        # API reference
│
├── Jenkinsfile                        # Jenkins pipeline
├── docker-compose.yml                 # Docker Compose
├── .gitignore                         # Git ignore rules
├── README.md                          # Project overview
├── CONTRIBUTING.md                    # Contributing guide
├── CHANGELOG.md                       # Version history
└── LICENSE                            # MIT License
```

## 🚀 Quick Start

### 1️⃣ Prerequisites Check
```bash
git --version     # Git
flutter --version # Flutter
python3 --version # Python
docker --version  # Docker
```

### 2️⃣ Initialize Project
```bash
bash scripts/init.sh     # Make scripts executable
bash scripts/setup.sh    # Install dependencies
```

### 3️⃣ Start Services
```bash
docker-compose up -d    # Start RethinkDB + Backend
# Wait ~10 seconds for initialization
```

### 4️⃣ Run Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Check: http://localhost:8000/docs
```

### 5️⃣ Run Frontend
```bash
cd frontend
flutter pub get
flutter run          # Or: flutter run -d web
```

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Flutter 3.0+ | Mobile UI, animations |
| **Backend** | Python 3.11, FastAPI | API, orchestration |
| **Database** | RethinkDB 2.4 | NoSQL, real-time queries |
| **DevOps** | Docker, Jenkins | Containerization, CI/CD |
| **Animation** | Canvas API | Mouth shape viseme |

### Data Flow

```
User (Flutter App)
    ↓
[API Client] → HTTP/REST
    ↓
[FastAPI Backend]
    ├─ Lesson Service (lesson selection)
    ├─ Progress Service (track attempts)
    └─ Recording Service (save audio)
    ↓
[RethinkDB]
    ├─ lessons table
    ├─ user_progress table
    └─ recordings table
```

## 📋 Key Features

✅ **Lesson Management**
- Random phoneme selection
- Phoneme-specific queries
- Difficulty progression

✅ **Animation System**
- Real-time viseme synchronization
- Mouth shape transitions (rest, smile, open, round)
- 60fps smooth animation

✅ **Audio Handling**
- Playback from URL or local file
- Recording upload support
- Duration tracking

✅ **Progress Tracking**
- Attempt counting
- Score management
- Mastery detection (score ≥ 0.8)

✅ **Developer Experience**
- Docker Compose for local dev
- Hot reload (Flutter & backend)
- Interactive API docs (Swagger)
- Comprehensive logging

## 🔧 Development Commands

### Backend

```bash
# Activate environment
source backend/venv/bin/activate

# Run server
uvicorn app.main:app --reload

# Run tests
pytest backend/tests/ -v

# Format code
black backend/app/

# Lint
flake8 backend/app --max-line-length=120
```

### Frontend

```bash
# Get dependencies
flutter pub get

# Run app
flutter run

# Run tests
flutter test

# Format code
flutter format lib/

# Analyze
flutter analyze
```

### Docker

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild images
docker-compose build --no-cache
```

### CI/CD

```bash
# Validate Jenkinsfile
jenkins-lint Jenkinsfile

# View pipeline (when Jenkins running)
open http://localhost:8080/blue
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lesson` | Get random lesson |
| GET | `/api/lessons` | Get all lessons |
| GET | `/api/lesson/{phoneme}` | Get by phoneme |
| POST | `/api/feedback` | Submit recording |
| GET | `/api/progression/{user_id}` | Get progress |
| POST | `/api/health` | Health check |

**Interactive Docs**: http://localhost:8000/docs

## 🗄️ Database Tables

### lessons
```json
{
  "id": "lesson_p",
  "phoneme": "/p/",
  "prompt": "Pop like a puppy!",
  "audio_url": "https://...",
  "visemes": [...],
  "difficulty": 1
}
```

### user_progress
```json
{
  "user_id": "demo_user",
  "phoneme": "/p/",
  "attempts": 5,
  "best_score": 0.92,
  "mastered": true
}
```

### recordings
```json
{
  "user_id": "demo_user",
  "lesson_id": "lesson_p",
  "duration_ms": 2500,
  "file_path": "./uploads/xxx.wav"
}
```

## 🧪 Testing

```bash
# Backend tests
cd backend && pytest tests/ -v --cov=app

# Frontend tests
cd frontend && flutter test

# Integration tests
bash scripts/test.sh
```

## 🔐 Security Features

- CORS configured for development
- Input validation via Pydantic
- File upload sanitization
- No SQL injection (RethinkDB ORM)
- Error handling with custom exceptions

**⚠️ Note**: For production, add:
- JWT authentication
- HTTPS/TLS
- Database user/pass
- Rate limiting
- Input size limits

## 🚀 Deployment

### Docker Build
```bash
cd backend
docker build -t phonetics-backend:1.0 .
docker run -p 8000:8000 -e RDB_HOST=host.docker.internal phonetics-backend:1.0
```

### Registry Push
```bash
docker tag phonetics-backend:1.0 myrepo/phonetics-backend:1.0
docker push myrepo/phonetics-backend:1.0
```

### Environment Variables
```
RDB_HOST=rethinkdb-prod
RDB_PORT=28015
RDB_DB=phonetics
PORT=8000
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 in use | `lsof -ti:8000 \| xargs kill -9` |
| RethinkDB connection error | Check Docker: `docker ps` |
| Flutter can't find SDK | `flutter doctor` and follow prompts |
| API CORS error | Update `api_service.dart` base URL |

## 📚 Documentation

- **Setup**: [docs/SETUP.md](docs/SETUP.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **API**: http://localhost:8000/docs

## 🤝 Contributing

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Fork & create feature branch
3. Make changes & add tests
4. Submit PR with description

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 🎯 Roadmap

- [ ] v1.1: ML-based scoring
- [ ] v1.2: Rive characters
- [ ] v1.3: Teacher dashboard
- [ ] v2.0: Multi-language, 3D models

## 👥 Team

- **Lead Developer**: Your Name
- **Contributors**: [See CHANGELOG.md](CHANGELOG.md)

## 📞 Support

- Issues: GitHub Issues
- Email: dev@example.com
- Docs: See `/docs` folder

---

**Created**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready (MVP)

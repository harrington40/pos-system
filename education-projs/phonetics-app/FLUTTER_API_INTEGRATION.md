# Flutter App ↔ Python Backend Integration Guide

## Overview

The Flutter frontend communicates with your existing Python FastAPI backend via HTTP. All requests/responses follow REST conventions with JSON payloads.

**Backend URL**: `http://localhost:8000/api` (configurable in `lib/config/api_config.dart`)

## API Endpoints

### 1. Get Single Lesson

**Endpoint**: `GET /api/lesson`

**Response**:
```json
{
  "id": "lesson_1",
  "phoneme": "a",
  "audio_url": "http://localhost:8000/audio/a.mp3",
  "example_words": ["cat", "car", "can"],
  "viseme": "rest"
}
```

**Used by**: Displayed in practice activities (ListenChooseActivity, etc.)

**Flutter Integration**:
```dart
final lesson = await apiService.getLesson();
// Use lesson.phoneme, lesson.exampleWords, lesson.audioUrl
```

---

### 2. Build Session

**Endpoint**: `POST /api/learning/build-session`

**Request**:
```json
{
  "duration_minutes": 5
}
```

**Response**:
```json
{
  "session": [
    {
      "id": "item_1",
      "skill_id": "skill_a",
      "type": "listen_choose",
      "lesson": { ... lesson object ... }
    },
    {
      "id": "item_2",
      "skill_id": "skill_e",
      "type": "build_word",
      "lesson": { ... lesson object ... }
    },
    ...
  ]
}
```

**Logic**: Backend builds session with 60% due reviews + 30% current stage + 10% challenge blend.

**Flutter Integration**:
```dart
final result = await apiService.buildSession();
// Parse session items and populate SessionNotifier
sessionNotifier.buildSession();
```

---

### 3. Submit Feedback (Quality Update + SM-2)

**Endpoint**: `POST /api/learning/feedback`

**Request**:
```json
{
  "item_id": "item_1",
  "correct": true,
  "seconds_spent": 12,
  "hints_used": 0,
  "quality": 5
}
```

**Response**:
```json
{
  "skill_id": "skill_a",
  "mastery": 0.85,
  "total_attempts": 5,
  "correct_attempts": 4,
  "due_at": "2025-12-20T10:30:00Z",
  "sm2_factor": 2.6,
  "interval": 3
}
```

**Backend Logic**:
- Calculates new `mastery` score
- Updates SM-2 factor based on quality
- Schedules next review via `due_at`
- Tracks confusion pairs (if wrong, logs skill pairing)

**Flutter Integration**:
```dart
final feedback = SessionFeedback(
  itemId: 'item_1',
  correct: true,
  secondsSpent: 12,
  hintsUsed: 0,
  quality: 5,
);
final updated = await apiService.submitFeedback(feedback);
// Update local progress state
ref.refresh(progressProvider);
```

---

### 4. Get Progress List

**Endpoint**: `GET /api/learning/progress`

**Response**:
```json
[
  {
    "skill_id": "skill_a",
    "mastery": 0.85,
    "total_attempts": 5,
    "correct_attempts": 4,
    "due_at": "2025-12-20T10:30:00Z",
    "sm2_factor": 2.6,
    "interval": 3
  },
  {
    "skill_id": "skill_e",
    "mastery": 0.3,
    "total_attempts": 2,
    "correct_attempts": 0,
    "due_at": "2025-12-18T14:00:00Z",
    "sm2_factor": 1.3,
    "interval": 1
  }
]
```

**Used by**: Progress screen (Sound Garden), parent analytics, session planner

**Flutter Integration**:
```dart
final progressProvider = FutureProvider((ref) async {
  return ref.watch(apiServiceProvider).getProgress();
});

// In ProgressScreen:
progressData.when(
  data: (progress) {
    // Map skill_id to plant mastery level
    // mastery < 0.3 = seed, 0.3-0.7 = sprout, 0.7+ = flower
  },
);
```

---

### 5. Get Admin Stats

**Endpoint**: `GET /api/admin/stats`

**Response**:
```json
{
  "total_time": 120,
  "mastered_count": 8,
  "streak": 7,
  "review_due": 6,
  "next_review": "2025-12-20T09:00:00Z",
  "mastery_threshold": 0.8,
  "most_missed": [
    { "pair": ["s", "sh"], "confusion_count": 3 },
    { "pair": ["b", "d"], "confusion_count": 2 }
  ]
}
```

**Used by**: Parent dashboard (behind gate)

**Flutter Integration**:
```dart
final adminStatsProvider = FutureProvider((ref) async {
  return ref.watch(apiServiceProvider).getAdminStats();
});

// In ParentScreen:
adminStats.when(
  data: (stats) {
    print('Total time: ${stats['total_time']} min');
    print('Mastered: ${stats['mastered_count']}/15');
  },
);
```

---

## Request/Response Flow Example

### Scenario: Kid completes one practice item

```
1. [App] User taps "Check" after answering
   
2. [App] Calculate quality (0-5)
   quality = 5 (correct, 8 seconds, 0 hints)
   
3. [App] Create SessionFeedback
   {
     "item_id": "item_1",
     "correct": true,
     "seconds_spent": 8,
     "hints_used": 0,
     "quality": 5
   }

4. [App] POST /api/learning/feedback
   
5. [Backend] processes:
   - Finds skill_a in database
   - Applies SM-2 formula: EF' = EF + (0.1 - (5-quality)*0.08) = 2.5 + 0 = 2.5
   - No change since quality=5 (perfect)
   - Update interval = 1 * 2.5 = 2.5 days (round to 3)
   - Set due_at = now + 3 days
   - Update mastery = correctAttempts / totalAttempts = 5/5 = 1.0
   
6. [Backend] returns SkillProgress:
   {
     "skill_id": "skill_a",
     "mastery": 1.0,
     "due_at": "2025-12-21T...",
     "sm2_factor": 2.5,
     "interval": 3
   }

7. [App] updates local progress state
   ref.refresh(progressProvider)
   
8. [App] moves to next item in session
```

---

## Data Models (Flutter ↔ Backend)

### Lesson (consistent)
```dart
class Lesson {
  final String id;
  final String phoneme;
  final String audioUrl;
  final List<String> exampleWords;
  final String viseme;
}
```

### SkillProgress (consistent)
```dart
class SkillProgress {
  final String skillId;
  final double mastery;       // 0.0 to 1.0
  final int totalAttempts;
  final int correctAttempts;
  final DateTime dueAt;       // Next review time
  final double sm2Factor;     // Easiness factor
  final int interval;         // Days until next review
}
```

### SessionFeedback → SessionItem
```dart
class SessionFeedback {
  final String itemId;
  final bool correct;
  final int secondsSpent;
  final int hintsUsed;
  final int quality;          // 0-5 (calculated by app)
}
```

---

## Error Handling

**ApiService** wraps all endpoints with try-catch:

```dart
try {
  final response = await http.get(uri).timeout(Duration(seconds: 10));
  if (response.statusCode == 200) {
    return parseResponse(response.body);
  } else {
    throw Exception('Failed: ${response.statusCode}');
  }
} catch (e) {
  throw Exception('Error: $e');
}
```

**In Flutter screens**, handle errors via FutureProvider:

```dart
adminStats.when(
  data: (stats) { /* success */ },
  loading: () { /* show spinner */ },
  error: (err, stack) { /* show error dialog */ },
);
```

---

## CORS & Headers

**Backend** (FastAPI) must allow Flutter app origin:

```python
# In backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Flutter** includes JSON content-type header:

```dart
headers: {'Content-Type': 'application/json'},
body: jsonEncode(data),
```

---

## Testing the Integration

### 1. Test endpoint directly (curl)
```bash
curl -X POST http://localhost:8000/api/learning/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "item_1",
    "correct": true,
    "seconds_spent": 12,
    "hints_used": 0,
    "quality": 5
  }'
```

### 2. Enable HTTP logging in Flutter
```dart
// In ApiService, add logging
print('→ ${response.request.method} ${response.request.url}');
print('← ${response.statusCode} ${response.reasonPhrase}');
print('Body: ${response.body}');
```

### 3. Run app with backend up
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Run Flutter app
cd flutter_app
flutter run -d chrome
```

---

## Roadmap

- [x] Stateless endpoints (getLesson, getProgress, getAdminStats)
- [x] Session building (60/30/10 mix)
- [x] Feedback submission (quality → SM-2 update)
- [ ] Speech recognition (POST /api/learning/record-audio)
- [ ] Streaming (WebSocket for real-time progress)
- [ ] Batch operations (submit multiple feedbacks at once)
- [ ] Analytics (custom event tracking)

---

## Questions?

- Check `lib/services/api_service.dart` for implementation
- See `backend/app/routes/learning.py` for backend logic
- Review models in `lib/models/models.dart` and `backend/app/models/schemas.py`

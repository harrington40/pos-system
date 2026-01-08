# 🎓 Teacher Dashboard - Real-Time Classroom Integration Guide

## Overview

The **Teacher Dashboard** is a real-time classroom monitoring system that allows teachers to:
- Monitor multiple students' learning progress simultaneously
- Track phoneme mastery and accuracy in real-time
- Send messages and guidance to individual students or entire classes
- View comprehensive analytics and error patterns
- Manage class enrollment with unique class codes

## Key Features

### 1. **Real-Time Student Monitoring**
- View all enrolled students with live status (Active, Practicing, Idle)
- Monitor current activity and phoneme being practiced
- Track individual student mastery levels (0-100%)
- See pronunciation accuracy scores

### 2. **Class Analytics**
- **Phoneme Mastery Distribution**: Visual breakdown of student progress across all 15 phonemes
- **Daily Activity Chart**: Track practice sessions over the week
- **Class Performance Metrics**: Average mastery, accuracy, and practice time
- **Error Pattern Analysis**: Identify which phonemes are causing the most confusion

### 3. **Student Management**
- Unique class code for students to join
- Real-time roster of connected students
- Individual student detail view with comprehensive stats
- Time-based filtering (last active status)

### 4. **Communication & Guidance**
- Send messages to individual students or entire class
- Request live sessions for direct interaction
- Real-time activity feed showing student progress
- Notifications of important milestones

### 5. **Dashboard Organization**
- Search/filter students by name or status
- Responsive design for desktop and tablet viewing
- Organized layout with analytics, student cards, and activity feeds
- API status indicator showing backend connectivity

---

## Access & Setup

### 1. **Access the Dashboard**
```
URL: http://localhost:3000/teacher-dashboard.html
```

### 2. **Class Code Setup**
- Each teacher receives a unique **Class Code** (e.g., `TEACHER01`)
- Share this code with students so they can connect
- Code is displayed prominently on the dashboard setup section

### 3. **Student Registration**
Students enter the class code in the mobile/web app:
```
Phonetics App → Settings → Join Classroom
→ Enter Class Code (e.g., TEACHER01)
→ Confirm to sync with teacher dashboard
```

---

## API Endpoints for Teachers

### Teacher Class Management

#### Create a Classroom
```http
POST /api/teacher/class/create
Content-Type: application/json

{
  "teacher_id": "teacher_123",
  "class_name": "2nd Grade Phonetics"
}
```

**Response:**
```json
{
  "success": true,
  "class_code": "TEACHER123",
  "class_name": "2nd Grade Phonetics",
  "teacher_id": "teacher_123"
}
```

#### Add Student to Class
```http
POST /api/teacher/class/{teacher_id}/add-student
Content-Type: application/json

{
  "student_id": "student_456",
  "student_name": "Alice Johnson"
}
```

#### Get All Class Students
```http
GET /api/teacher/class/{teacher_id}/students
```

**Response:**
```json
{
  "class_code": "TEACHER123",
  "total_students": 3,
  "students": [
    {
      "student_id": "student_1",
      "student_name": "Alice Johnson",
      "status": "active",
      "mastery_level": 0.65,
      "accuracy": 82,
      "practice_time": 45,
      "current_phoneme": "sh",
      "current_activity": "Listen→Choose",
      "streak": 5,
      "joined_at": "2025-01-10T14:30:00"
    }
  ]
}
```

#### Get Class Statistics
```http
GET /api/teacher/class/{teacher_id}/stats
```

**Response:**
```json
{
  "total_students": 3,
  "active_students": 2,
  "average_mastery": 0.65,
  "average_accuracy": 82.5,
  "total_practice_time": 150,
  "phoneme_completion": {
    "a": { "mastered": 3, "practicing": 0, "learning": 0 },
    "e": { "mastered": 2, "practicing": 1, "learning": 0 }
  }
}
```

#### Get Individual Student Details
```http
GET /api/teacher/class/{teacher_id}/student/{student_id}
```

**Response:**
```json
{
  "student_id": "student_1",
  "student_name": "Alice Johnson",
  "status": "active",
  "mastery_level": 0.65,
  "accuracy": 82,
  "practice_time": 45,
  "streak": 5,
  "mastered_phonemes": ["a", "e", "i", "o", "u"],
  "current_phoneme": "sh",
  "current_activity": "Listen→Choose",
  "error_patterns": {
    "sh": 3,
    "ch": 1
  },
  "last_active": "2025-01-10T14:35:00"
}
```

### Student Progress Updates

#### Update Student Progress (Real-Time)
```http
POST /api/student/{student_id}/update-progress
Content-Type: application/json

{
  "teacher_id": "teacher_123",
  "phoneme": "sh",
  "activity": "Listen→Choose",
  "quality": 5,
  "accuracy": 95.5
}
```

#### Send Message to Student(s)
```http
POST /api/teacher/class/{teacher_id}/send-message
Content-Type: application/json

{
  "student_id": "student_1",  // null for entire class
  "message": "Great job! Try to say it slower next time."
}
```

### WebSocket Real-Time Connections

#### Teacher Connection (Receive Real-Time Updates)
```javascript
const ws = new WebSocket('ws://localhost:8000/api/teacher/ws/teacher/{teacher_id}');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'student_progress') {
    console.log(`${message.student_id}: ${message.phoneme} - ${message.accuracy}%`);
  }
  
  if (message.type === 'teacher_message') {
    console.log(`Message for ${message.target_student}: ${message.message}`);
  }
};

// Request class stats
ws.send(JSON.stringify({ type: 'get_class_stats' }));
```

#### Student Connection (Send Real-Time Updates)
```javascript
const ws = new WebSocket('ws://localhost:8000/api/teacher/ws/student/{student_id}');

// Send progress update
ws.send(JSON.stringify({
  teacher_id: 'teacher_123',
  type: 'progress_update',
  phoneme: 'sh',
  accuracy: 85,
  quality: 4
}));
```

---

## Dashboard UI Components

### Student Card
Each student is displayed as an interactive card showing:
- **Student Name**: With grade/class info
- **Status Badge**: 🟢 Active, 🟡 Practicing, ⚫ Idle
- **Current Activity**: The learning activity they're doing
- **Quick Stats**:
  - Mastery %: Overall phoneme mastery
  - Accuracy %: Current accuracy score
  - Practice Time: Minutes practiced today
  - Streak: Days of consecutive practice
- **Mastered Phonemes**: Visual badges of completed phonemes
- **Action Buttons**:
  - 💬 **Message**: Send quick feedback
  - 📊 **Detail**: View full student profile

### Analytics Section
- **Phoneme Mastery Distribution**: Doughnut chart showing class progress
- **Daily Activity Chart**: Line graph of practice sessions over the week

### Class Setup Section
- Display unique class code
- Easy copy-to-clipboard button
- Instructions for student enrollment

### Real-Time Activity Feed
- Shows student completions and milestones
- Timestamps for all activities
- Running log of class events

### Search & Filter
- **Search Box**: Filter students by name
- **Status Filter**: Show Active, Practicing, or Idle students
- Instant updates as you type

---

## How Students Connect to Teacher

### Step-by-Step for Students

1. **Open the Phonetics App** (Mobile or Web)
2. **Go to Settings → Classroom**
3. **Select "Join a Classroom"**
4. **Enter Teacher's Class Code** (e.g., `TEACHER01`)
5. **Confirm Student Name**
6. **Tap "Connect to Class"**
7. **App shows:** "📡 Connected to [Teacher Name]'s Classroom"

### Continuous Sync
Once connected, the app automatically sends:
- ✅ Every phoneme attempt
- ✅ Accuracy scores
- ✅ Activity completion
- ✅ Practice time
- ✅ Mastery updates

---

## Interpretation Guide

### Mastery Level (0-100%)
- **0-20%**: Just starting (learning first phonemes)
- **20-40%**: Beginner (5+ phonemes)
- **40-60%**: Intermediate (8-10 phonemes)
- **60-80%**: Advanced (12+ phonemes)
- **80-100%**: Expert (all 15 phonemes mastered)

### Accuracy Score (0-100%)
- **< 70%**: Needs improvement, consider feedback
- **70-85%**: Good progress, encourage consistency
- **85-95%**: Excellent work
- **95-100%**: Mastery achieved

### Activity Status
- **🟢 Active**: Currently practicing
- **🟡 Practicing**: In lesson but not actively responding
- **⚫ Idle**: Not active in last 5 minutes

### Streak
- **0-3 days**: Building habit
- **4-7 days**: Good routine established
- **7+ days**: Excellent consistency!

---

## Real-Time Data Refresh

The dashboard updates every 5 seconds:
1. Student status checks
2. Mastery level updates
3. Practice time accumulation
4. Activity feed new entries

Manual refresh available with **🔄 Refresh** button.

---

## Example Workflows

### Workflow 1: Supporting a Struggling Student
1. Notice "Bob Smith" has low accuracy (72%) on "sh" phoneme
2. Click **📊 Detail** on his card
3. See error patterns (sh has 5 attempts)
4. Click **💬 Message**
5. Send: "Bob, try saying 'shhhh' like a snake. You're doing great!"
6. Monitor his accuracy improve in real-time

### Workflow 2: Recognizing Progress
1. See "Carol White" master her 12th phoneme
2. Activity feed shows: "✅ Carol mastered 'th'"
3. Click **💬 Message**
4. Send: "🎉 Amazing job! You're almost there!"
5. Check her stats dashboard to see updated progress

### Workflow 3: Class-Wide Announcement
1. Want to explain a technique to whole class
2. Click **▶ Start Class**
3. Sends welcome message to all students
4. All student apps show: "Class session started"
5. Can send follow-up messages with guidance

---

## API Integration with Student App

### How the Phonetics App Connects

The Flutter/web app includes connection code:

```dart
// In Flutter app
final teacherCode = _classCodeController.text;

// Join classroom
final response = await ApiService.post(
  '/api/teacher/class/join',
  {
    'student_id': studentId,
    'student_name': studentName,
    'class_code': teacherCode
  }
);

// Start sending updates
_startSyncingWithTeacher(teacherId);

// Every activity completion
ApiService.post('/api/student/$studentId/update-progress', {
  'teacher_id': teacherId,
  'phoneme': phoneme,
  'activity': activityType,
  'quality': qualityScore,
  'accuracy': accuracyPercent
});
```

---

## Troubleshooting

### Students Not Appearing in Dashboard
- ✅ Confirm students entered correct class code
- ✅ Check student's internet connection
- ✅ Refresh teacher dashboard
- ✅ Verify backend is running (`lsof -i :8000`)

### Real-Time Updates Not Working
- ✅ Check API status indicator (top right)
- ✅ Verify WebSocket connection: Open Browser DevTools → Console
- ✅ Look for error messages in backend logs
- ✅ Try refreshing the dashboard

### Student Stats Not Updating
- ✅ Ensure student is actively practicing
- ✅ Check connection status in their app
- ✅ Wait for automatic 5-second refresh
- ✅ Use manual **🔄 Refresh** button

### Class Code Issues
- ✅ Code is visible in "Class Setup" section
- ✅ Code format: All caps (e.g., `TEACHER01`)
- ✅ Each teacher has unique code
- ✅ Code generated automatically when class created

---

## Configuration & Customization

### Environment Variables
```
TEACHER_ID=teacher_unique_id  # Auto-generated
CLASS_NAME=My Classroom        # Customizable
WS_PORT=8000                   # WebSocket backend port
```

### Refresh Intervals
- Dashboard stats: 5 seconds (auto) or manual
- Activity feed: Real-time (instant)
- Chart updates: 10 seconds

### Customizable Messages
Templates available in modals for common guidance:
- "Good try! Focus on the vowel sound."
- "Excellent! You're progressing quickly."
- "Let's practice this phoneme more."

---

## Security & Privacy

✅ **Class Codes**: Unique per teacher, prevents unauthorized access
✅ **Student Data**: Only visible to enrolled teacher
✅ **Secure WebSocket**: WSS (secure) recommended for production
✅ **Session Timeout**: Students auto-disconnect after 30 minutes idle

---

## Mobile/Tablet Responsiveness

The dashboard is fully responsive:
- **Desktop (1400px+)**: Full grid layout with all features
- **Tablet (768px-1400px)**: Stacked cards, single-column
- **Mobile (< 768px)**: Vertical stack, touch-optimized buttons

---

## Next Steps

1. **Test Teacher Dashboard**: Open in browser
2. **Create Test Class**: Use "Class Setup" section
3. **Register Test Students**: Use add-student endpoint
4. **Monitor Progress**: Watch real-time updates
5. **Send Messages**: Test teacher-to-student communication
6. **Review Analytics**: Interpret class statistics

---

**Questions?** Refer to the [API_INTEGRATION](FLUTTER_API_INTEGRATION.md) guide for detailed endpoint information.

# 🎓 Teacher Dashboard - Quick Start (5 Minutes)

## What You Just Got

A **real-time classroom monitoring dashboard** where you can:
- 👥 See all your students' progress live
- 📊 Track their phoneme mastery in real-time
- 💬 Send messages and guidance
- 📈 View class analytics and error patterns
- 🎯 Monitor individual student performance

---

## Quick Setup (2 minutes)

### 1. Open the Dashboard
```
http://localhost:3000/teacher-dashboard.html
```

### 2. Your Class Code
- Look for the **"Class Setup"** section
- Your code: `TEACHER01` (displayed prominently)
- Click 📋 to copy

### 3. Share with Students
Send this to each student:
```
"Enter this code in Phonetics App settings:
TEACHER01"
```

### 4. Students Connect
They go to: **App → Settings → Join Classroom**
- Enter: `TEACHER01`
- Confirm name
- Tap "Connect"
- ✅ Connected!

---

## What You'll See

### Student Cards (Real-Time)
Each student appears as a card showing:
- **Status**: 🟢 Active, 🟡 Practicing, ⚫ Idle
- **Mastery %**: Overall progress (0-100%)
- **Accuracy %**: Current pronunciation accuracy
- **Practice Time**: Minutes today
- **Current Activity**: What they're doing right now
- **Mastered Phonemes**: Visual badges (✓)

### Dashboard Stats (Top)
- **Students Active**: How many are practicing now
- **Avg. Mastery**: Class average mastery %
- **Class Performance**: Visual progress bar
- **Total Practice Time**: Week total

### Analytics
- **Phoneme Mastery Chart**: Breakdown of which phonemes are mastered
- **Daily Activity Chart**: Practice sessions by day of week
- **Real-Time Feed**: Activity updates from students

---

## 3 Key Actions

### Action 1: Monitor Student
1. See a student card
2. Note their **status** and **accuracy**
3. Provides instant class overview

### Action 2: Get Details
1. Click **📊 Detail** on any student card
2. Modal opens with full stats:
   - Phonemes mastered: `Alice (9/15)`
   - Accuracy: `82%`
   - Practice time: `45 minutes`
   - Error patterns (which sounds are hard)
3. See complete learning profile

### Action 3: Send Feedback
1. Click **💬 Message** on student card
2. Type encouragement:
   - "Great effort! Try to slow down"
   - "You're doing amazing! Keep it up!"
   - "Let's focus on the /sh/ sound"
3. Message appears on student's screen
4. Encouragement in real-time!

---

## Real-Time Monitoring

### What Updates Live
✅ **Every 5 seconds:**
- Student status changes
- Practice time accumulates
- Accuracy scores update
- Mastery levels increase

✅ **Real-time (instant):**
- Student completions
- Phoneme masteries
- Error notifications
- Messages received

### What You Can See Right Now
Try the demo:
1. Look at "Carol White" - **85% mastery** (12 phonemes)
2. Watch "Alice Johnson" - **65% mastery** (9 phonemes)
3. See "Bob Smith" - **45% mastery** (5 phonemes)
4. Notice their **Current Activity** and **Phoneme**
5. Click **Refresh** to see updated stats

---

## Understanding the Dashboard

### Mastery Levels
```
0-20%   → Just starting 🌱
20-40%  → Beginner 🌱
40-60%  → Intermediate 🌿
60-80%  → Advanced 🌿
80-100% → Expert 🌻
```

### Student Status
- **🟢 Active**: Actively practicing right now
- **🟡 Practicing**: In app but not responding
- **⚫ Idle**: Not active for 5+ minutes

### Accuracy Zones
- **< 70%**: Needs help - consider feedback
- **70-85%**: Good - encourage more practice
- **85-95%**: Excellent - nearly mastered
- **95-100%**: Perfect - ready for next phoneme

---

## Key Features Explained

### 1. Search Students
```
Type name → "Alice" 
Results filter instantly
```

### 2. Filter by Status
```
Select "Active" → See only practicing students
Select "Practicing" → See in-app but idle
Select "Idle" → See not active
```

### 3. Class Analytics
- **Doughnut Chart**: % of students at each mastery stage
- **Line Chart**: Daily practice trend (Mon-Sun)
- Helps identify patterns in class learning

### 4. Real-Time Activity Feed
- Bottom right corner
- Shows student achievements
- Latest: "Bob completed phoneme (72% mastery)"
- Running log of all class events

### 5. API Status
- Top right corner
- Green dot = Backend connected ✅
- Red dot = Backend disconnected ❌

---

## Example Classroom Scenarios

### Scenario 1: Support a Struggling Learner
```
⏰ 2:15 PM
👀 See Bob has 72% accuracy on "cat" activity
⚠️ His error pattern shows "cat" is hard
💬 Click Message: "Say each sound slowly: cuh-aaa-tuh"
👁️ Watch his accuracy improve to 85% in real-time
```

### Scenario 2: Celebrate Progress
```
⏰ 2:30 PM
🎉 Activity feed shows: "Alice mastered phoneme 'sh'"
📊 Her mastery jumps from 60% → 65%
💬 Send: "🎉 Amazing! You just mastered /sh/!"
🔥 Notice her 5-day streak continues
```

### Scenario 3: Class-Wide Guidance
```
⏰ 2:45 PM
📊 Analytics show "blends" is challenging for class
🎓 Start Class with announcement
💬 Send to all: "Today we focus on /bl/ /br/ blends"
📈 Watch whole class shift to blend activities
```

---

## Common Questions

**Q: How do I get students connected?**
A: Share your class code (TEACHER01) in settings. They enter it in their app → instant sync.

**Q: Do I need to do anything for real-time sync?**
A: No! Once they enter code, syncing is automatic. Just keep dashboard open.

**Q: Can I see their voice recordings?**
A: No - only their accuracy score and mastery progress. Recordings stay private.

**Q: What if a student doesn't appear?**
A: Check they entered correct code. Refresh dashboard. Might take 5 seconds to appear.

**Q: How often does data update?**
A: Every 5 seconds automatically. Use Refresh button for instant update.

**Q: Can I message individual students?**
A: Yes - click Message on their card. Or send to whole class in Start Class.

**Q: What's the difference between accuracy and mastery?**
A: Accuracy = current attempt score. Mastery = overall progress across all attempts.

**Q: Can students see the dashboard?**
A: No - only you as teacher. Students see their own app progress.

---

## First 5 Minutes Checklist

- [ ] Open dashboard: `http://localhost:3000/teacher-dashboard.html`
- [ ] Copy your class code from "Class Setup" section
- [ ] Share code with your students
- [ ] Students enter code in app settings
- [ ] Wait 5 seconds - students appear on dashboard!
- [ ] Click on a student card to see details
- [ ] Click "Message" to send feedback
- [ ] Watch real-time updates as they practice

---

## What Happens When Students Practice

### Behind the Scenes
```
Student App                    Teacher Dashboard
─────────────────────          ──────────────────
Student taps "Get Lesson"      
  ↓
App gets phoneme "sh"          
  ↓
Student tries 3 times          
  ↓
Quality score = 4              
  ↓
                               ← Teacher sees real-time update:
                                 "Alice: sh - 82% accuracy"
                               
Real-time progress update sent → Teacher dashboard refreshes
                               
                               ← Teacher sees "mastered_phonemes"
                                 increased to 10/15
                               
                               ← Teacher can click "Message"
                                 and send encouragement
```

---

## Advanced Features (Explore Later)

### 1. Student Detail Modal
Click **📊 Detail** to see:
- All phonemes mastered (visual list)
- Error patterns (which sounds are hard)
- Full accuracy history
- Streak information

### 2. Analytics
- Understand which phonemes are easiest/hardest
- See practice patterns throughout week
- Identify class-wide trouble areas

### 3. Real-Time Feeding
- Notifications appear as events happen
- Timestamps for tracking when things occurred
- Activity log for historical review

### 4. WebSocket Connection
- Teacher dashboard stays connected
- Receives updates the moment students complete activities
- No need to manually refresh (but can if needed)

---

## Troubleshooting

**Students not appearing?**
1. Verify they entered correct code: `TEACHER01`
2. Check their internet connection
3. Click Refresh button on dashboard
4. Check if backend is running: `lsof -i :8000`

**Stats not updating?**
1. Wait 5 seconds for automatic refresh
2. Click manual Refresh button
3. Check API status indicator (top right)
4. Verify student is actively practicing

**Accuracy scores seem low?**
- This is normal for language learning
- Track improvement over sessions
- Provide gentle guidance
- Celebrate incremental progress

**Can't copy class code?**
1. Try clicking button again
2. Manually select and copy code from display
3. Check browser clipboard permissions

---

## Next Steps

### Immediate (Now)
1. ✅ Share class code with students
2. ✅ Have them enter it in their apps
3. ✅ Watch them appear on your dashboard
4. ✅ See their progress update in real-time

### Short Term (Next Class)
1. Monitor your first group of students
2. Get familiar with the interface
3. Send encouraging messages
4. Notice patterns in what's hard/easy

### Long Term (Ongoing)
1. Use analytics to guide instruction
2. Personalize practice based on data
3. Celebrate milestones with your class
4. Track progress over weeks/months

---

## Quick Reference

| Action | Steps |
|--------|-------|
| **Share Class Code** | Copy from "Class Setup" section → Share with students |
| **Add Student** | They enter code in app → appear automatically |
| **View Details** | Click 📊 Detail on their card |
| **Send Message** | Click 💬 Message → Type → Send |
| **Start Class** | Click ▶ Start Class → Sends announcement |
| **Refresh Data** | Click 🔄 Refresh button |
| **Check Status** | Look at colored badges: 🟢 🟡 ⚫ |
| **View Analytics** | Scroll to charts section |
| **Search Student** | Type name in search box |
| **Filter by Status** | Use dropdown select |

---

## API Endpoints (For Developers)

Connect students programmatically:

```bash
# Create class
curl -X POST http://localhost:8000/api/teacher/class/create \
  -H "Content-Type: application/json" \
  -d '{"teacher_id": "teacher_123", "class_name": "My Class"}'

# Get all students
curl http://localhost:8000/api/teacher/class/teacher_123/students

# Get class stats
curl http://localhost:8000/api/teacher/class/teacher_123/stats
```

See [TEACHER_DASHBOARD_GUIDE.md](TEACHER_DASHBOARD_GUIDE.md) for full API documentation.

---

## You're Ready! 🎉

You now have a fully functional real-time classroom monitoring system. 

**Next step:** Share the class code with your students and watch them connect in real-time!

---

**Need more help?** See:
- 📖 [Full Teacher Dashboard Guide](TEACHER_DASHBOARD_GUIDE.md) - Comprehensive documentation
- 👨‍🎓 [Student Connection Guide](STUDENT_CONNECTION_GUIDE.md) - How students connect
- 📋 [API Reference](TEACHER_DASHBOARD_GUIDE.md#api-endpoints-for-teachers) - Technical details

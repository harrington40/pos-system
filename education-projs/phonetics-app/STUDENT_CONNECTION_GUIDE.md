# 📡 Student-to-Teacher Connection Guide

## How Students Connect to Their Teacher's Classroom

### For Web App Users

#### Step 1: Open Settings
- Click the **⚙️ Settings** button (bottom right of app)
- Scroll to **"Classroom Connection"** section

#### Step 2: Enter Class Code
- Tap **"Join a Classroom"**
- A dialog will appear with a text input field
- Enter the **Class Code** provided by your teacher
- Format: All uppercase (e.g., `TEACHER01`)

#### Step 3: Confirm Your Name
- The app will ask: "What's your name?"
- Type your first name or student ID
- Tap **"Continue"**

#### Step 4: Connect
- Tap **"Connect to Classroom"** button
- Wait for confirmation: **"✅ Connected!"**
- Your app is now synced with the teacher's dashboard

#### Step 5: See the Indicator
- Top right corner shows: **📡 Connected to [Teacher Name]**
- Green indicator means active connection
- Teacher can now see your progress in real-time

---

### For Flutter Mobile App Users

#### Step 1: Settings Menu
1. Tap the **⚙️ Settings icon** (top right)
2. Scroll down to **Classroom** section
3. Tap **"Join Classroom"**

#### Step 2: Classroom Code
- Modal appears: "Enter Teacher's Class Code"
- Tap the text field and type the code
- Example: `TEACHER01`
- Press keyboard Done

#### Step 3: Student Information
- Next screen: "What's your name?"
- Enter your first name (e.g., "Alice")
- Tap **Next**

#### Step 4: Connection Confirmation
- "Connecting to classroom..."
- Wait 2-3 seconds for connection
- Success: **"✅ You're connected!"**
- Option to return to app or see more info

#### Step 5: Start Practicing
- Close settings
- Your app is now broadcasting to teacher
- Practice as usual - teacher sees everything!

---

## What Gets Shared with Teacher?

Once connected, your teacher can see in real-time:

✅ **Current Activity**
- What phoneme you're practicing
- Which activity (Listen→Choose, Build Word, Read→Pick)
- How long you've been practicing

✅ **Performance Metrics**
- Your accuracy score on each attempt
- Your overall mastery percentage
- Your daily practice streak

✅ **Progress Tracking**
- Which phonemes you've mastered (✓)
- Which you're currently learning
- Your practice history for the week

✅ **Status**
- 🟢 Active - You're currently practicing
- 🟡 Practicing - In lesson, waiting
- ⚫ Idle - Not active for 5+ minutes

❌ **NOT Shared with Teacher**
- Your voice recordings (private)
- Your exact pronunciation attempts
- Any other personal data beyond learning stats
- Time spent away from the app

---

## Classroom Features Once Connected

### 1. **Real-Time Feedback**
- Teacher can send messages during practice
- Example: "Great try! Say it a bit slower"
- Messages appear as notifications on your screen

### 2. **Streak Tracking**
- Your teacher sees your practice streak
- Example: "🔥 5 day streak!"
- Encouragement from teacher when streak grows

### 3. **Progress Dashboard**
- Teacher monitors your learning journey
- Can see which phonemes you're mastering fastest
- Can identify where you might need help

### 4. **Class Analytics**
- Teacher tracks whole class progress
- Identifies common phonemes everyone struggles with
- Can adjust lessons based on class-wide patterns

### 5. **Communication**
- Teacher sends guidance: "Let's focus on /sh/"
- Teacher celebrates milestones: "Phoneme Mastered! 🎉"
- Teacher provides hints: "Think of a snake: sssssss"

---

## Troubleshooting Connection Issues

### "Code not recognized"
✅ Check spelling of class code (all UPPERCASE)
✅ Ask teacher to verify correct code
✅ Try copying/pasting code instead of typing

### "Connection failed"
✅ Check your internet connection
✅ Reload the page/restart the app
✅ Verify backend server is running
✅ Wait 10 seconds and try again

### "Connected but teacher can't see me"
✅ Check internet connection (WiFi/mobile data)
✅ Teacher dashboard must be open and refreshed
✅ Tap **"Refresh"** button in teacher dashboard
✅ Start a new practice activity

### "Lost connection"
- 🔄 App automatically reconnects
- Try closing and reopening settings
- Check your internet connection
- Teacher dashboard shows you as "Idle" until reconnected

### "Wrong class code entered"
✅ Go back to Settings
✅ Select "Change Classroom"
✅ Enter correct class code
✅ Confirm connection again

---

## Disconnecting from Classroom

If you need to disconnect:

#### Web App:
1. Click **⚙️ Settings**
2. Find **Classroom** section
3. Click **"Leave Classroom"**
4. Confirm: "Are you sure?"
5. You're now disconnected from teacher dashboard

#### Mobile App:
1. Tap **⚙️ Settings**
2. Scroll to **Classroom**
3. Tap **"Disconnect from Classroom"**
4. Confirm to leave
5. No longer synced with teacher

---

## What Teachers Can Do While You're Connected

### Monitor Your Learning
- 👀 Watch your accuracy improve
- 📊 See mastered phonemes increase
- ⏱️ Track your practice time

### Send Encouragement
- 💬 "You're doing great!"
- 🎯 "Try to focus on your mouth shape"
- 🎉 "Phoneme mastered!"

### Identify Trouble Areas
- Where you're struggling
- Which phonemes need more practice
- Your learning patterns

### Adapt Lessons
- Teacher adjusts difficulty based on your progress
- Provides more practice on hard phonemes
- Celebrates quick learners with harder challenges

### Communication
- Direct messages from teacher
- Requests for live sessions
- Class-wide announcements

---

## Privacy & Safety

### What's Protected
🔒 Your voice recordings are **never shared**
🔒 Personal information is **encrypted**
🔒 Connection is **only** to your enrolled teacher
🔒 Data only visible during active classroom session

### What's Shared (Performance Only)
📊 Your phoneme mastery levels
📊 Your accuracy scores
📊 Your practice time
📊 Your learning progress

### Best Practices
✅ Only connect to your actual teacher's class code
✅ Don't share class codes with others
✅ Your account is private to your teacher
✅ Disconnect if you're not in teacher's class

---

## Connection Types

### **Active Connection** (Green 🟢)
- Your app is running
- Data syncing in real-time
- Teacher can see you practicing

### **Last Seen** (Gray ⚫)
- Your app was last active 5+ minutes ago
- Teacher sees when you were last active
- Data stopped updating

### **Offline** (Red ❌)
- You've disconnected or closed the app
- Teacher knows you're not practicing
- No data is being sent

---

## Class Codes Explained

### Format
```
TEACHER01
--------
 ^^^^^^^
  Teacher's code (all caps, 8-12 characters)
```

### Examples
- `TEACHER01` - First period teacher
- `SMITH_CLASS` - Teacher's last name
- `MS_JOHNSON` - Teacher's title + name

### How It Works
1. Teacher creates class → Gets unique code
2. Teacher shares code with students
3. Student enters code → App connects to teacher
4. Multiple students can use same code (they're all in same class)
5. Each student's data kept separate but visible to teacher

---

## Verifying You're Connected

### Check 1: Connection Indicator
- Look top right of your app
- Should show: **📡 Connected** (green dot)
- Hovering shows teacher info

### Check 2: Settings Display
- Open Settings → Classroom
- Should show: ✅ **Connected to [Teacher Code]**
- Show option to **"Change Classroom"** or **"Disconnect"**

### Check 3: Activity Feed
- Teacher dashboard shows your name
- Your card displays your current activity
- Green status badge shows you're online

### Check 4: Real-Time Updates
- Complete a practice activity
- Check teacher dashboard within 5 seconds
- You should see your accuracy updated
- If updated immediately, real-time sync is working!

---

## FAQ for Students

**Q: Will the teacher see my voice recordings?**
A: No, only your accuracy score and progress metrics. Voice is never recorded or shared.

**Q: Can the teacher see me when I'm not practicing?**
A: The teacher can see you're offline (last active time), but no activity data is sent.

**Q: What if I close the app?**
A: Teacher sees you went offline. Progress syncs again when you reopen app.

**Q: Can I be in multiple classrooms?**
A: Yes, but only one at a time. You can switch by entering different class code.

**Q: Is my data private?**
A: Yes, only visible to your enrolled teacher. Encrypted and secure.

**Q: What if I make a mistake entering the code?**
A: You can change it in Settings → Classroom → Change Code. Just enter the correct one.

**Q: Will the teacher know every time I make a mistake?**
A: Teacher sees your final accuracy % but not individual pronunciation attempts.

**Q: Can the teacher force me to practice?**
A: No, teacher can only see what you're doing and send encouragement/messages.

---

## For Teachers: Setting Up Student Connections

### How to Share Your Class Code

1. **Get Your Code**: Opens automatically on Teacher Dashboard
2. **Copy It**: Click 📋 button to copy
3. **Share It**: Email, text, or write on whiteboard
4. **Tell Students**: "Enter code [YOUR_CODE] in app settings"

### How to Enroll Students

#### Method 1: Automatic (Best)
- Students enter code in their app
- Teacher dashboard auto-detects them
- Appear in student list within 5 seconds

#### Method 2: Manual (Backup)
- Use add-student API endpoint
- Useful if class code isn't working
- Add via Teacher Dashboard admin panel

### Monitoring Connection Status

- **🟢 Active**: Student is currently practicing
- **🟡 Practicing**: In app but in menu
- **⚫ Idle**: Last active 5+ minutes ago
- **❌ Offline**: Not connected

---

## Next Steps

1. ✅ Get class code from your teacher
2. ✅ Open Phonetics App
3. ✅ Go to Settings → Join Classroom
4. ✅ Enter class code
5. ✅ Confirm name
6. ✅ Connect
7. ✅ See "✅ Connected" indicator
8. ✅ Start practicing - teacher can see you!

---

**Need help?** Ask your teacher or check the full [Teacher Dashboard Guide](TEACHER_DASHBOARD_GUIDE.md).

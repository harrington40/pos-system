# 🎓 Phonetics Learning App - Flutter UI/UX Implementation Overview

## ✨ Complete Feature Set Implemented

### Screen 1: Today (Daily Session Hub)
```
┌─────────────────────────────┐
│ Good morning! 👋        🔒  │  ← Parent gate (hold 2s)
│ 🔥 7-day streak             │
├─────────────────────────────┤
│ Today's mission: 5 minutes  │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │  🎯                   │   │
│ │ Ready to practice?    │   │
│ │ [Start Lesson]        │   │  ← BigPrimaryButton
│ └───────────────────────┘   │
├─────────────────────────────┤
│ [Review due: 6] [New: 1]    │  ← Info cards (soft gradient)
├─────────────────────────────┤
│ Today's reward path         │
│ ⭐ ⭐ ⭐ ⭐ ⭐              │  ← 0/5 stars earned
└─────────────────────────────┘
```

**Components**: SoftCard, BigPrimaryButton, streak display
**Data**: buildSession() → list of 12-18 items (60/30/10)
**UX**: Motivational, no pressure, immediate "start" button

---

### Screen 2: Practice Runner (Universal Shell)
```
┌─────────────────────────────┐
│ ← [Back]        ●●○○○      │  ← Progress dots
├─────────────────────────────┤
│                             │
│      [Activity Widget]      │
│   (swaps based on type)     │
│                             │
│   ┌─────────────────┐       │
│   │ Listen→Choose   │       │
│   │ Build Word      │  Option A: "Listen→Choose"
│   │ Read→Pick       │       │
│   └─────────────────┘       │
│                             │
├─────────────────────────────┤
│ [Check]  or  [Next]         │  ← BigPrimaryButton
└─────────────────────────────┘

Feedback feedback feedback
├ "Try again!" (shake + red border)
├ "Nice!" (pop + green checkmark)
└ "You got it!" (bounce + stars)
```

**Components**: ProgressDots, activity widgets, BigPrimaryButton
**Logic**: Timer + hintsUsed + correct → quality (0-5) → feedback → next
**UX**: No long explanations, instant micro-feedback

---

### Activity A: Listen→Choose (Phoneme Recognition)

```
┌─────────────────────────────┐
│ Listen              💡 Hint  │
├─────────────────────────────┤
│                             │
│           🔊 (Large FAB)   │  ← Play phoneme audio
│                             │
│ Tap the sound you hear      │  ← Kid-friendly text
├─────────────────────────────┤
│  ┌──────┐    ┌──────┐      │
│  │  a   │    │  b   │      │  ← Giant letter tiles
│  └──────┘    └──────┘      │
│  ┌──────┐    ┌──────┐      │
│  │  p   │    │  m   │      │
│  └──────┘    └──────┘      │
└─────────────────────────────┘

Feedback:
├ Correct (0 tries): Green pop + sparkles + quality 5
├ Correct (2 tries): Small sparkles + quality 3
└ Incorrect (2 tries): Red shake, show correct
```

**Algorithm Integration**: hintsUsed increments if replay > 2x
**Mastery**: Correct + fast = high SM-2 factor update

---

### Activity B: Build Word (CVC/CCVC)

```
┌─────────────────────────────┐
│           [Picture]         │  ← Image placeholder (cat)
├─────────────────────────────┤
│       [ _ ] [ _ ] [ _ ]     │  ← Slots (click to undo)
├─────────────────────────────┤
│  Available letters:         │
│  [C]  [A]  [T]             │  ← LetterTile widgets
│                             │
│ Tap to place, then blend:   │
│ [C][A][T] slide together    │
└─────────────────────────────┘

Feedback:
├ Slow correct: "Great slow progress!" + quality 2
└ Fast correct: "Awesome blend!" + pop animation + quality 5
```

**Measures**: Speed (slow vs. fast correct) helps detect decoding struggles
**Mastery**: Correct placement → confidence update

---

### Activity C: Read→Pick Picture (Comprehension)

```
┌─────────────────────────────┐
│       ┌──────────────┐      │
│       │    "cat"     │      │  ← Large word card
│       └──────────────┘      │
├─────────────────────────────┤
│  [Read to me] (hint button) │
├─────────────────────────────┤
│   [🐱 cat]  [🏠 house]    │
│                             │
│   [🐶 dog]               │  ← 3 picture options
│                             │
└─────────────────────────────┘

Feedback:
├ Correct: "Great reading!" + pop + quality 4
└ Incorrect: "That's a dog, not a cat!" + redirection
```

**Algorithm**: Read-aloud button counts as hint (hintsUsed++)
**Mastery**: No hints → higher quality score

---

### Screen 3: Sound Garden (Kid Progress View)
```
┌─────────────────────────────┐
│ Sound Garden 🌻             │
│ Watch sounds grow!          │
├─────────────────────────────┤
│  🌱  🌱  🌿  🌻  🌻  🌻  │
│  a   e   i   o   u   b    │
│  ▓▓░░░░░  ▓▓▓░░░░░  ▓▓▓▓ │
│  [■■░░]  [■■■░░]  [■■■■] │
│                             │
│  🌿  🌿  🌻  🌻  🌻  🌱  │
│  c   d   f   g   h   j    │
│  [■■░░]  [■■■░░]  [■■■■] │
│                             │
│ Tap a plant to hear + words │
└─────────────────────────────┘

Mastery mapping:
├ 🌱 Seed:   0.0 - 0.3 (just started)
├ 🌿 Sprout: 0.3 - 0.7 (practicing)
└ 🌻 Flower: 0.7 - 1.0 (mastered!)
```

**UX**: Gamified, visual growth, no numbers, tappable for audio
**Data**: `mastery` from SkillProgress list

---

### Screen 4: Parent Dashboard (Gated)
```
┌─────────────────────────────┐
│ Parent Access               │
│ Hold for 2 seconds:         │
│       [2s / 2s] ✓           │  ← Unlock button
└─────────────────────────────┘
        ↓ (on unlock)
┌─────────────────────────────┐
│ Parent Dashboard            │
├─────────────────────────────┤
│ Total practice: 120 min      │
│ Phonemes mastered: 8 / 15   │
│ Current streak: 7 days      │
├─────────────────────────────┤
│ Areas to focus:             │
│ ⚠ sh-ch confusion (3x)     │
│ ⚠ blends (br, cr, etc.)    │
│ ⚠ long vowels              │
├─────────────────────────────┤
│ [Settings: 5min / Speech ON │
│  Dyslexia font OFF]         │
├─────────────────────────────┤
│ SM-2 Transparency:          │
│ Review due: 6               │
│ Mastery threshold: 0.8      │
│ Next review: Tomorrow       │
└─────────────────────────────┘
```

**Gate**: Hold button 2 seconds (prevents accidental kid access)
**Analytics**: Mastery chart, confusion pairs, session length control
**Settings**: Difficulty cap, speech mode, font options

---

## 🎨 Design System Tokens

### Color Palette (Pastel + Accessible)
| Color | Hex | Use |
|-------|-----|-----|
| Primary Pastel | #B39DDB | Buttons, highlights |
| Secondary Pastel | #81C784 | Success, cards |
| Accent Pastel | #FFAB91 | Rewards, CTAs |
| Success Green | #66BB6A | Correct feedback |
| Error Red | #EF5350 | Incorrect, warnings |
| Background Light | #FAFAFA | Main BG |
| Card White | #FFFFFF | Cards, elevated |
| Text Dark | #212121 | Body text |
| Text Muted | #757575 | Secondary text |

### Typography (Kid-Friendly & Readable)
| Role | Font | Size | Weight |
|------|------|------|--------|
| Display | Fredoka | 32px | Bold |
| H1 | Fredoka | 24px | Bold |
| H2 | Fredoka | 20px | 600 |
| Body | Nunito | 16px | 400 |
| Small | Nunito | 14px | 400 |
| Button | Fredoka | 16px | Bold |

### Spacing
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Border Radius (Soft, Friendly)
- xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px

---

## 📊 Data Flow Architecture

```
┌──────────────────────────────────────────────────┐
│ Flutter Frontend (lib/)                          │
│  ├─ TodayScreen ──┐                             │
│  ├─ PracticeScreen ├─→ SessionNotifier          │
│  ├─ ProgressScreen─┤   (Riverpod)              │
│  └─ ParentScreen ──┤                            │
└────────┬───────────┴────────────────────────────┘
         │
         ↓ (HTTP POST/GET)
┌──────────────────────────────────────────────────┐
│ Python Backend (backend/app/)                    │
│  ├─ routes/lessons.py                           │
│  ├─ routes/learning.py (SM-2, mastery, quality) │
│  ├─ routes/admin.py (stats for parent)          │
│  └─ services/learning_algorithm.py              │
└──────────────────────────────────────────────────┘
         │
         ↓ (SQL queries)
┌──────────────────────────────────────────────────┐
│ SQLite Database (in-memory or persistent)        │
│  ├─ lessons (phoneme, audio_url, viseme)        │
│  ├─ skill_progress (mastery, due_at, sm2_factor)│
│  └─ attempt_log (correct, seconds, hints)       │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Algorithm Integration Points

### 1. Session Building (Today → Start)
```dart
sessionNotifier.buildSession()
  → POST /api/learning/build-session
  → Backend returns 60% due + 30% current + 10% challenge
  → UI renders first item
```

### 2. Quality Calculation (Practice → Check)
```dart
quality = _calculateQuality(correct, secondsSpent, hintsUsed)
  // 5: fast + correct + no hints
  // 1: incorrect
```

### 3. SM-2 Update (Practice → Submit Feedback)
```dart
POST /api/learning/feedback
  → Backend: quality 0-5 → SM-2 formula
  → Update due_at (interval * SM2_factor)
  → Return SkillProgress with new mastery
```

### 4. Mastery Display (Progress → Sound Garden)
```dart
mastery < 0.3 → 🌱 Seed
mastery 0.3-0.7 → 🌿 Sprout
mastery ≥ 0.7 → 🌻 Flower
```

---

## 🔄 Complete User Journey

```
1. ONBOARD
   App opens → Today screen
   Sees "Start Lesson" + streak
   
2. START
   Tap "Start Lesson"
   → buildSession() returns 12-18 items
   → Progress dots show: ●○○○○
   
3. PRACTICE ITEM 1
   System renders activity widget (e.g., Listen→Choose)
   Child completes task (20 sec, 1 hint, correct)
   
4. SUBMIT FEEDBACK
   quality = 3 (medium speed + correct + 1 hint)
   POST feedback → backend updates SM-2 factor
   Backend returns: mastery updated, next due date set
   
5. NEXT ITEM
   Progress dots: ●●○○○
   New activity loaded
   Repeat steps 3-5
   
6. END SESSION (after item 12-18)
   Show RewardBadge: "You earned 3 stars! 🌟"
   Update streak: "7-day streak! 🔥"
   Tip: "Come back tomorrow for more"
   
7. BACK HOME
   Return to Today screen
   Streak updated, reward path filled (3/5 stars)
   
8. PROGRESS VIEW
   Tap "Progress" → Sound Garden
   See plants grew: 🌱→🌿→🌻
   Tap a plant → hear audio + example words
   
9. PARENT GATE
   Tap 🔒 → hold button 2 seconds
   → Parent Dashboard shows:
      - Mastered: 8/15
      - Areas to focus: sh-ch confusion
      - Recommend 5 min daily
```

---

## 📱 Screen Layout (Portrait + Tablet Scaling)

All screens use `SafeArea` + responsive padding:
- **Phone** (375px): Full-width buttons, 2-col grids
- **Tablet** (600px+): Wider cards, 3-col grids, centered max-width

---

## ✅ Implementation Checklist

- [x] Color system (pastel palette)
- [x] Typography (Fredoka + Nunito)
- [x] Spacing & radius tokens
- [x] TodayScreen with cards & CTA
- [x] PracticeScreen with activity shell
- [x] 3 activity widgets (Listen, Build, Read)
- [x] ProgressScreen (Sound Garden + Parent Dashboard)
- [x] ParentScreen (gated, stats, settings)
- [x] Riverpod providers (session, progress, admin)
- [x] API service (5 endpoints wired)
- [x] GoRouter navigation (4 routes)
- [x] Reusable components (Button, Card, Tile, Plant)
- [x] Error handling & loading states
- [x] Quality scoring algorithm
- [x] Documentation + guides

---

## 🚀 Next Steps (Optional Enhancements)

1. **Audio**: Wire up `just_audio` for phoneme/word playback
2. **Speech**: Add speech-to-text validation for student pronunciation
3. **Animations**: Enhance with flutter_animate (tile bounce, pop effects)
4. **Local DB**: sqflite for offline caching
5. **Analytics**: Firebase to track user behavior
6. **Localization**: Multi-language support (es, fr, etc.)
7. **Accessibility**: TalkBack/VoiceOver improvements
8. **Notifications**: Push reminders to practice daily

---

## 🎓 Key Features Summary

| Feature | Kid View | Parent View | Backend Integration |
|---------|----------|-------------|-------------------|
| Daily Sessions | ✅ Today screen | ✅ Streak tracking | ✅ buildSession() |
| Practice Activities | ✅ 3 types | — | ✅ feedback endpoint |
| Progress Tracking | ✅ Sound Garden | ✅ Mastery charts | ✅ progressProvider |
| Rewards | ✅ Stars, streaks | ✅ Analytics | ✅ rewards API |
| Difficulty | Auto-adaptive | ✅ Set difficulty cap | ✅ SM-2 algorithm |
| Accessibility | ✅ Large targets | ✅ Dyslexia font | ✅ Settings API |

---

This is a **production-ready, fully-integrated Flutter skeleton** ready for audio, animations, and mobile testing! 🚀

# Flutter App: Quick Start Guide

## 📦 What's Included

This is a production-ready Flutter skeleton that implements the complete UI/UX design you requested:

✅ **Bottom navigation**: Today, Practice, Progress, Parent (gated)
✅ **Today screen**: Streak, mission, start CTA, review due/new sounds cards, reward path
✅ **Practice shell**: Progress dots, activity widget swap, check/next button, hints
✅ **3 activity types**: Listen→Choose, Build Word, Read→Pick Picture
✅ **Progress screens**: Kid view (Sound Garden), parent view (analytics)
✅ **Parent gate**: Hold-to-unlock security
✅ **Design system**: Cute pastel colors, Fredoka/Nunito fonts, Material 3
✅ **Riverpod state**: SessionNotifier, progressProvider, adminStatsProvider
✅ **API integration**: Wired to your Python backend (http://localhost:8000)

## 🎯 Architecture

**Navigation**: GoRouter with 4 routes (/today, /practice, /progress, /parent)
**State**: Riverpod providers (session, progress, admin stats)
**Components**: Reusable widgets (BigPrimaryButton, SoftCard, LetterTile, MasteryPlant)
**Data flow**: ApiService → providers → screens

## 🚀 To Run

```bash
cd flutter_app
flutter pub get
flutter run -d chrome  # or omit -d for phone
```

First screen you'll see: **Today** (start lesson, streak, cards)

## 🔧 What to Add Next

Your code is ready for:

1. **Audio (just_audio package)**
   - In `BuildWordActivity._handleLetterTap()` and `ListenChooseActivity._handleReplay()`
   - Path: `assets/audio/phonemes/{phoneme}.mp3`

2. **Speech Recognition (speech_to_text package)**
   - For practice feedback validation
   - Add microphone button to bottom of Practice shell

3. **Animations (flutter_animate package)**
   - Tile bounce: wrap LetterTile in `.animate().scale()`
   - Checkmark pop: add checkmark animation to feedback dialog
   - Progress dots: `.animate().fadeIn()` as user progresses

4. **Local DB (sqflite package)**
   - Cache session items and progress
   - Enable offline practice
   - Sync on reconnect

5. **Custom fonts**
   - Add Fredoka and Nunito TTF files to `assets/fonts/`
   - Already declared in pubspec.yaml

## 📁 File Structure

```
flutter_app/
├── pubspec.yaml              # Dependencies
├── lib/
│   ├── main.dart            # Entry point + theme
│   ├── config/
│   │   ├── theme.dart       # Colors, typography, spacing
│   │   ├── api_config.dart  # Backend URL
│   │   └── router.dart      # GoRouter setup
│   ├── models/              # Data classes (Lesson, SkillProgress, etc.)
│   ├── providers/           # Riverpod state management
│   ├── services/            # ApiService for HTTP
│   ├── screens/             # TodayScreen, PracticeScreen, ProgressScreen, ParentScreen
│   └── widgets/             # Reusable UI components + activities
├── android/                 # Android-specific config
└── ios/                     # iOS-specific config (not yet scaffolded)
```

## 🎨 Design Decisions

- **Cute Pastel**: Primary #B39DDB, Secondary #81C784, Accent #FFAB91
- **Typography**: Fredoka (headings, playful), Nunito (body, readable)
- **No failure vibe**: "Try again" instead of "Wrong!", shake instead of red X
- **Micro-rewards**: Stars, streaks, plant growth, sticker unlocks
- **Parent access**: Hold-to-unlock + optional math gate (you can add)

## 🔌 Backend Integration

Your app talks to:
- `GET /api/lesson` → get single lesson
- `POST /api/learning/build-session` → get session plan (60/30/10 mix)
- `POST /api/learning/feedback` → submit answer (triggers SM-2 update)
- `GET /api/learning/progress` → skill progress list
- `GET /api/admin/stats` → parent dashboard

Your Python backend (/backend/app/routes/) is already set up to handle these.

## 🧠 Quality Scoring

The app calculates `quality` (0-5) before sending feedback:

```
quality = 5: fast + correct + no hints
quality = 4: medium speed + correct + ≤1 hint
quality = 3: slower + correct + ≤2 hints
quality = 2: slow + correct
quality = 1: incorrect
```

Backend uses this quality score to update SM-2 factor and schedule next review.

## 📊 Example User Flow

1. Kid opens app → **Today screen**
2. Taps "Start Lesson" → calls `/api/learning/build-session`
3. Enters **Practice** with 12-18 items (60% review, 30% current, 10% challenge)
4. For each item:
   - System renders correct activity widget
   - Kid does the task
   - System calculates quality and submits to `/api/learning/feedback`
5. After all items → **Rewards screen** (3 stars, sticker, "come back tomorrow")
6. Taps "Back Home" → returns to **Today**

## 🛠️ Customization

### Change colors?
Edit `lib/config/theme.dart` → `AppColors` class

### Change fonts?
Edit `lib/config/theme.dart` → `AppTypography` class (also add TTF files to `assets/fonts/`)

### Add new screen?
1. Create `lib/screens/my_feature/my_screen.dart`
2. Add route in `lib/config/router.dart`
3. Wire data via providers in `lib/providers/providers.dart`

### Add new activity type?
1. Create widget in `lib/widgets/activities.dart`
2. Add case in `PracticeScreen._buildActivityWidget()`
3. Ensure backend returns matching `type` in session items

## 🚨 Before Going to Production

- [ ] Update `ApiConfig.backendUrl` with production server
- [ ] Add error logging (Sentry, Firebase Crashlytics)
- [ ] Test on real Android/iOS devices
- [ ] Add privacy policy for App Store
- [ ] Set up app signing (Android keystore, iOS certificates)
- [ ] Consider rate limiting on practice sessions
- [ ] Add analytics (Firebase Analytics)
- [ ] Implement payment if monetizing (Google Play, App Store)

## 💡 Tips

- Run `flutter analyze` to catch lint issues
- Use `flutter pub upgrade` to update dependencies
- Test web build: `flutter run -d chrome`
- Hot reload during development: press `r` in terminal
- Use GoRouter devtools: add `routerLogging: enable` to debug navigation

## ❓ Need Help?

Refer to:
- `/flutter_app/README.md` for full architecture docs
- `lib/config/theme.dart` for design token changes
- `lib/services/api_service.dart` for backend API patterns
- `lib/providers/providers.dart` for state management patterns

Good luck! 🚀

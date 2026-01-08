# 🚀 Flutter App - Quick Reference Card

## Getting Started (5 minutes)

```bash
# 1. Install dependencies
cd flutter_app
flutter pub get

# 2. Run the app
flutter run -d chrome           # Web
flutter run                     # Phone (if connected)

# 3. Open in browser
http://localhost:3000           # Should show Today screen
```

---

## File Quick Links

| File | Purpose | Edit for |
|------|---------|----------|
| `lib/main.dart` | Entry point + theme | Colors, Material 3 setup |
| `lib/config/theme.dart` | Design tokens | Colors, fonts, spacing |
| `lib/config/api_config.dart` | Backend URL | Change server address |
| `lib/models/models.dart` | Data classes | Add new data fields |
| `lib/providers/providers.dart` | State management | Add new providers |
| `lib/screens/today/today_screen.dart` | Daily hub | Customize Today experience |
| `lib/screens/practice/practice_screen.dart` | Practice shell | Add new activity types |
| `lib/widgets/activities.dart` | Activity implementations | Create new activities |
| `pubspec.yaml` | Dependencies | Add audio, animations, etc. |

---

## Common Tasks

### Change App Colors
```dart
// lib/config/theme.dart
class AppColors {
  static const primaryPastel = Color(0xFFYOUR_HEX); // Change here
}
```

### Add New Screen
```dart
// 1. Create: lib/screens/my_feature/my_screen.dart
class MyScreen extends ConsumerWidget { ... }

// 2. Add route to lib/config/router.dart
GoRoute(path: '/my-feature', builder: (context, state) => MyScreen()),

// 3. Navigate from elsewhere
context.go('/my-feature');
```

### Add New Activity Type
```dart
// 1. Create in lib/widgets/activities.dart
class MyActivityWidget extends StatefulWidget { ... }

// 2. Add case in PracticeScreen._buildActivityWidget()
case 'my_type':
  return MyActivityWidget(item: item, onSubmit: ...);

// 3. Backend returns type: 'my_type' in session items
```

### Wire Audio Playback
```dart
// lib/widgets/activities.dart (in any activity)
// Add to pubspec.yaml: just_audio: ^0.9.30

import 'package:just_audio/just_audio.dart';

void _playAudio(String audioUrl) async {
  final player = AudioPlayer();
  await player.setUrl(audioUrl);
  await player.play();
}
```

### Add Animations
```dart
// lib/widgets/activities.dart (example)
// Add to pubspec.yaml: flutter_animate: ^4.2.0

import 'package:flutter_animate/flutter_animate.dart';

// Wrap widget with animation
container.animate().scale(duration: 300.ms);
```

---

## API Endpoints Reference

```
Backend URL: http://localhost:8000/api

GET  /lesson
     ↓ Returns single random phoneme

POST /learning/build-session
     ↓ body: { "duration_minutes": 5 }
     ↓ Returns: { "session": [items...] }

POST /learning/feedback
     ↓ body: { "item_id", "correct", "seconds_spent", "hints_used", "quality" }
     ↓ Returns: SkillProgress (mastery, due_at, sm2_factor)

GET  /learning/progress
     ↓ Returns: [SkillProgress...]

GET  /admin/stats
     ↓ Returns: { "mastered_count", "streak", "most_missed", ... }
```

---

## State Management (Riverpod) Quick Guide

```dart
// Define a provider
final myProvider = Provider((ref) => MyService());
final myStateProvider = StateProvider<int>((ref) => 0);
final myAsyncProvider = FutureProvider((ref) async { ... });

// Use in widget
class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(myProvider);
    final async = ref.watch(myAsyncProvider);
    
    // For state changes
    ref.read(myStateProvider.notifier).state = newValue;
    
    // To refresh data
    ref.refresh(myProvider);
  }
}
```

---

## Component Quick Reference

| Component | File | Usage |
|-----------|------|-------|
| `BigPrimaryButton` | reusable_widgets | Large kid-friendly button |
| `SoftCard` | reusable_widgets | Gradient card with shadow |
| `LetterTile` | reusable_widgets | Interactive letter (draggable) |
| `ProgressDots` | reusable_widgets | Question index (●●○○○) |
| `RewardBadge` | reusable_widgets | Animated reward with stars |
| `MasteryPlant` | reusable_widgets | Gamified progress (🌱→🌿→🌻) |
| `ListenChooseActivity` | activities | Phoneme recognition |
| `BuildWordActivity` | activities | Letter tile word building |
| `ReadPickActivity` | activities | Word comprehension |

---

## Navigation Patterns

```dart
// Navigate to screen
context.go('/today');
context.go('/practice');
context.go('/progress');
context.go('/parent');

// Navigate with data (if needed)
context.go('/practice?duration=7');

// Go back
context.pop();

// Replace current route
context.replace('/today');
```

---

## Debug Tips

```bash
# Run with verbose logging
flutter run -v

# Clear cache and rebuild
flutter clean
flutter pub get
flutter run

# Test on web (interactive)
flutter run -d chrome

# Check for errors
flutter analyze

# Format code
dart format .

# Get device list
flutter devices
```

---

## Design System Spacing

```dart
AppSpacing.xs   // 4px
AppSpacing.sm   // 8px
AppSpacing.md   // 16px (most common)
AppSpacing.lg   // 24px
AppSpacing.xl   // 32px

AppRadius.xs    // 8px
AppRadius.sm    // 12px
AppRadius.md    // 16px
AppRadius.lg    // 24px (most common)
AppRadius.xl    // 32px
```

---

## Responsive Design

```dart
// Check screen size
final isMobile = MediaQuery.of(context).size.width < 600;
final isTablet = MediaQuery.of(context).size.width >= 600;

// Adapt layout
if (isMobile) {
  return MobileLayout();
} else {
  return TabletLayout();
}

// Or use GridView with responsive columns
GridView.count(
  crossAxisCount: isMobile ? 2 : 3,  // 2 cols phone, 3 cols tablet
  ...
)
```

---

## Error Handling Pattern

```dart
// In FutureProvider
asyncData.when(
  data: (result) {
    // Success
    return SuccessWidget(result);
  },
  loading: () {
    // Loading
    return CircularProgressIndicator();
  },
  error: (err, stack) {
    // Error
    return ErrorWidget(error: err.toString());
  },
);
```

---

## Quality Scoring Formula

```dart
int _calculateQuality(bool correct, int secondsSpent, int hintsUsed) {
  if (!correct) return 1;  // Incorrect = 1
  
  if (secondsSpent < 5 && hintsUsed == 0) return 5;   // Perfect
  if (secondsSpent < 10 && hintsUsed <= 1) return 4;  // Good
  if (secondsSpent < 20 && hintsUsed <= 2) return 3;  // OK
  return 2;  // Slow but correct
}
```

---

## SM-2 Spaced Repetition (Backend)

```
EF' = EF + (0.1 - (5 - quality) * 0.08)
interval = interval * EF (days)

Quality 5 (perfect):    EF unchanged,  interval grows
Quality 3 (medium):     EF stays same, interval changes
Quality 1 (incorrect):  EF drops,      interval resets to 1 day
```

---

## Mastery Plant Stages

```
mastery < 0.3  →  🌱 Seed   (just started)
mastery 0.3-0.7 → 🌿 Sprout (practicing)
mastery ≥ 0.7  →  🌻 Flower (mastered!)
```

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Connection refused" | Check backend is running on 8000 |
| "ProviderScope not found" | Wrap app in `ProviderScope(child: ...)` |
| "Route not found" | Check path in router.dart matches exactly |
| "Fonts not loading" | Run `flutter clean` + add TTF to `assets/fonts/` |
| "Hot reload stuck" | Kill and restart with `flutter run` |
| "Widget not updating" | Use `ref.refresh()` to trigger rebuild |

---

## Production Checklist

- [ ] Update backend URL for production server
- [ ] Test all 3 activity types
- [ ] Verify API responses with real data
- [ ] Test parent gate security
- [ ] Check accessibility (large fonts, contrast)
- [ ] Test on real phone (Android/iOS)
- [ ] Add error tracking (Sentry)
- [ ] Add analytics (Firebase)
- [ ] Set up app signing
- [ ] Write privacy policy
- [ ] Submit to App Store / Google Play

---

## Next: What to Add

### Must-Have
1. Audio playback (just_audio)
2. Animations (flutter_animate)
3. Local database (sqflite)

### Nice-to-Have
1. Speech recognition (speech_to_text)
2. Notifications (firebase_messaging)
3. Analytics (firebase_analytics)
4. Custom fonts (add TTF files)
5. Localization (easy_localization)

---

## Useful Links

- **Flutter Docs**: https://flutter.dev
- **Riverpod Docs**: https://riverpod.dev
- **GoRouter Docs**: https://pub.dev/packages/go_router
- **Your API Docs**: http://localhost:8000/docs
- **Material Design 3**: https://m3.material.io
- **Dart Packages**: https://pub.dev

---

## Keep This Handy!

Bookmark this file for quick reference while developing:
`/FLUTTER_QUICKSTART.md` → Full getting started guide
`/FLUTTER_API_INTEGRATION.md` → API specifications
`/FLUTTER_UI_OVERVIEW.md` → Screen mockups & design

---

Happy coding! 🚀 Questions? Check the guides in `/FLUTTER_*.md`

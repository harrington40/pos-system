# React Native Mobile App

## Setup Instructions

This is a React Native app built with Expo for iOS and Android support.

### Prerequisites

- Node.js >= 18
- iOS: Xcode and CocoaPods
- Android: Android Studio and Android SDK

### Installation

```bash
cd apps/mobile
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### iOS Specific Setup

For production iOS apps, you'll need to:

1. **Set up CallKit** for native call UI
2. **Configure VoIP Push Notifications**
3. **Add required capabilities** in Xcode:
   - Background Modes (Audio, VoIP)
   - Push Notifications

### Android Specific Setup

For production Android apps:

1. **Configure permissions** in AndroidManifest.xml:
   - RECORD_AUDIO
   - INTERNET
   - ACCESS_NETWORK_STATE

2. **Add foreground service** for persistent calls

### SIP Configuration

The mobile app uses the same SIP.js library with react-native-webrtc for media handling.

See the web app for SIP client implementation examples that can be adapted for React Native.

### Building for Production

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## Key Features to Implement

- [ ] CallKit integration (iOS)
- [ ] VoIP push notifications
- [ ] Background audio handling
- [ ] Contact integration
- [ ] Call history persistence
- [ ] Offline mode support

## Notes

Due to platform restrictions, the mobile app requires additional native modules and configuration that cannot be fully automated. Please refer to the React Native and Expo documentation for platform-specific setup.

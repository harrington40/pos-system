# Multi-Platform Build Pipelines Setup Guide

This guide explains how to set up three separate Jenkins pipelines for building the Phonetics Learning App for Android, iOS, and Web platforms.

## Overview

The project includes three platform-specific Jenkins pipelines:

1. **Jenkinsfile.android** - Builds Android APK and AAB
2. **Jenkinsfile.ios** - Builds iOS IPA (requires macOS)
3. **Jenkinsfile.web** - Builds Flutter Web app

## Architecture

```
┌─────────────────────────────────────────────┐
│         Git Repository (Main Branch)        │
└─────────────┬───────────────────────────────┘
              │
              ├───────────┬───────────┬────────────┐
              │           │           │            │
         ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐     │
         │ Android │ │   iOS   │ │   Web   │     │
         │Pipeline │ │Pipeline │ │Pipeline │     │
         └────┬────┘ └────┬────┘ └───┬─────┘     │
              │           │           │            │
         ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐     │
         │   APK   │ │   IPA   │ │  HTML   │     │
         │   AAB   │ │   .app  │ │   JS    │     │
         └────┬────┘ └────┬────┘ └───┬─────┘     │
              │           │           │            │
         ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐     │
         │Firebase │ │TestFlight│ │Firebase │     │
         │App Dist │ │          │ │Hosting  │     │
         └─────────┘ └──────────┘ └─────────┘     │
                                                   │
              ┌────────────────────────────────────┘
              │
         ┌────▼────┐
         │ Backend │
         │Pipeline │
         └─────────┘
```

## Prerequisites

### For All Platforms
- Jenkins server with appropriate agents
- Flutter SDK 3.16.0 or later
- Git access to the repository

### Android-Specific
- Android SDK
- Java JDK 11+
- Gradle

### iOS-Specific (Critical)
- **macOS Jenkins agent** (iOS builds REQUIRE macOS)
- Xcode 14+ installed
- Apple Developer account
- Code signing certificates
- Provisioning profiles
- CocoaPods installed

### Web-Specific
- Node.js (optional, for additional tools)
- Web server for deployment (nginx, Apache, or Firebase)

## Jenkins Setup

### 1. Create Android Pipeline

1. Open Jenkins: https://jenkins.transtechologies.com/
2. Click "New Item"
3. Name: **"Phonetics-App-Android"**
4. Type: **Pipeline**
5. Click "OK"

**Pipeline Configuration:**
- **Description**: Android APK/AAB build pipeline
- **Build Triggers**: ✓ Poll SCM: `H/5 * * * *`
- **Pipeline**:
  - Definition: Pipeline script from SCM
  - SCM: Git
  - Repository URL: Your repo URL
  - Branch: `*/main`
  - Script Path: `Jenkinsfile.android`

### 2. Create iOS Pipeline

1. Click "New Item"
2. Name: **"Phonetics-App-iOS"**
3. Type: **Pipeline**
4. Click "OK"

**Pipeline Configuration:**
- **Description**: iOS IPA build pipeline (requires macOS agent)
- **Build Triggers**: ✓ Poll SCM: `H/5 * * * *`
- **Restrict where this project can be run**: ✓ Check this
  - Label Expression: `macos` (your macOS agent label)
- **Pipeline**:
  - Definition: Pipeline script from SCM
  - SCM: Git
  - Repository URL: Your repo URL
  - Branch: `*/main`
  - Script Path: `Jenkinsfile.ios`

### 3. Create Web Pipeline

1. Click "New Item"
2. Name: **"Phonetics-App-Web"**
3. Type: **Pipeline**
4. Click "OK"

**Pipeline Configuration:**
- **Description**: Flutter Web build pipeline
- **Build Triggers**: ✓ Poll SCM: `H/5 * * * *`
- **Pipeline**:
  - Definition: Pipeline script from SCM
  - SCM: Git
  - Repository URL: Your repo URL
  - Branch: `*/main`
  - Script Path: `Jenkinsfile.web`

## Setting Up macOS Jenkins Agent (iOS Builds)

### Install Jenkins Agent on macOS

1. **On Jenkins Master:**
   - Manage Jenkins → Manage Nodes and Clouds
   - New Node → Name: "macos-agent"
   - Type: Permanent Agent
   - Labels: `macos`
   - Launch method: Launch agent via SSH

2. **On macOS Machine:**
   ```bash
   # Install Java
   brew install openjdk@11
   
   # Install Flutter
   git clone https://github.com/flutter/flutter.git -b stable ~/flutter
   export PATH="$PATH:$HOME/flutter/bin"
   echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
   
   # Install Xcode (from App Store)
   # Then install Xcode command line tools:
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   
   # Install CocoaPods
   sudo gem install cocoapods
   
   # Verify setup
   flutter doctor
   ```

3. **Configure SSH access:**
   ```bash
   # On macOS, enable Remote Login:
   # System Preferences → Sharing → Remote Login
   
   # Add Jenkins master's SSH key to authorized_keys
   cat jenkins-master-key.pub >> ~/.ssh/authorized_keys
   ```

## Flutter Configuration

### Android Configuration

Edit `flutter_app/android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.example.phonetics_app"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }
    
    signingConfigs {
        release {
            // Configure signing for release builds
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### iOS Configuration

Edit `flutter_app/ios/Runner.xcodeproj`:

1. Open in Xcode
2. Select Runner → Signing & Capabilities
3. Set Team, Bundle Identifier
4. Configure provisioning profiles

### Web Configuration

Edit `flutter_app/web/index.html` to customize:

```html
<head>
  <meta charset="UTF-8">
  <title>Phonetics Learning App</title>
  <meta name="description" content="Kid-friendly phonetics learning">
  <link rel="icon" type="image/png" href="favicon.png"/>
</head>
```

## Deployment Configuration

### Android - Firebase App Distribution

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login and configure:
   ```bash
   firebase login
   firebase init appdistribution
   ```

3. Add Firebase credentials to Jenkins:
   - Manage Jenkins → Credentials
   - Add "Secret text" with Firebase token
   - ID: `firebase-token`

4. Uncomment deployment stage in `Jenkinsfile.android`

### iOS - TestFlight

1. Create App Store Connect API key
2. Add credentials to Jenkins:
   - API Key ID
   - Issuer ID
   - Private key file

3. Uncomment deployment stage in `Jenkinsfile.ios`

### Web - Firebase Hosting

1. Initialize Firebase Hosting:
   ```bash
   cd flutter_app
   firebase init hosting
   ```

2. Configure `firebase.json`:
   ```json
   {
     "hosting": {
       "public": "build/web",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

3. Uncomment deployment stage in `Jenkinsfile.web`

## Running Builds

### Manual Builds

1. Go to Jenkins dashboard
2. Select pipeline (Android/iOS/Web)
3. Click "Build Now"
4. Monitor in "Console Output"

### Automatic Builds

Builds trigger automatically:
- On Git push (if webhook configured)
- Every 5 minutes via polling

### Build All Platforms

Create a multi-branch pipeline or use Jenkins Pipeline:

```groovy
pipeline {
    agent any
    stages {
        stage('Build All Platforms') {
            parallel {
                stage('Android') {
                    steps {
                        build job: 'Phonetics-App-Android', wait: false
                    }
                }
                stage('iOS') {
                    steps {
                        build job: 'Phonetics-App-iOS', wait: false
                    }
                }
                stage('Web') {
                    steps {
                        build job: 'Phonetics-App-Web', wait: false
                    }
                }
            }
        }
    }
}
```

## Build Artifacts

### Android
- **Location**: `artifacts/android/`
- **Files**:
  - `app-armeabi-v7a-release.apk`
  - `app-arm64-v8a-release.apk`
  - `app-x86_64-release.apk`
  - `app-release.aab` (Google Play)

### iOS
- **Location**: `artifacts/ios/`
- **Files**:
  - `Runner.app` (simulator/unsigned)
  - `phonetics-app.ipa` (signed for distribution)

### Web
- **Location**: `artifacts/web/`
- **Files**:
  - `index.html`
  - `main.dart.js`
  - `assets/`, `icons/`, etc.
- **Archive**: `web-build-{BUILD_NUMBER}.tar.gz`

## Monitoring Builds

### Dashboard View

Create a dashboard showing all three pipelines:

1. Install "Dashboard View" plugin
2. Create new view: "Mobile Builds"
3. Add all three pipeline jobs
4. Set refresh interval

### Build Status Badges

Add badges to README.md:

```markdown
[![Android Build](https://jenkins.transtechologies.com/buildStatus/icon?job=Phonetics-App-Android)](https://jenkins.transtechologies.com/job/Phonetics-App-Android/)
[![iOS Build](https://jenkins.transtechologies.com/buildStatus/icon?job=Phonetics-App-iOS)](https://jenkins.transtechologies.com/job/Phonetics-App-iOS/)
[![Web Build](https://jenkins.transtechologies.com/buildStatus/icon?job=Phonetics-App-Web)](https://jenkins.transtechologies.com/job/Phonetics-App-Web/)
```

## Troubleshooting

### Android Issues

**Problem**: Gradle build fails
**Solution**:
```bash
cd flutter_app/android
./gradlew clean
flutter clean
flutter pub get
```

**Problem**: Signing configuration not found
**Solution**: Create `android/key.properties` with signing credentials

### iOS Issues

**Problem**: "No provisioning profiles found"
**Solution**: 
- Open Xcode
- Sign in with Apple ID
- Select project → Signing
- Choose team and let Xcode manage signing

**Problem**: CocoaPods errors
**Solution**:
```bash
cd flutter_app/ios
pod repo update
pod install
```

### Web Issues

**Problem**: White screen after deployment
**Solution**: Check `<base href="/">` in `web/index.html`

**Problem**: Assets not loading
**Solution**: Verify asset paths in `pubspec.yaml` and rebuild

### Flutter Issues

**Problem**: Flutter not found in Jenkins
**Solution**:
```bash
# On Jenkins agent:
export PATH="$PATH:/opt/flutter/bin"
# Add to ~/.bashrc or agent startup script
```

**Problem**: Flutter doctor shows errors
**Solution**:
```bash
flutter doctor --verbose
# Follow recommendations to fix each issue
```

## Performance Optimization

### Parallel Builds

Run multiple builds simultaneously:
- Configure multiple executors in Jenkins
- Use different agents for each platform
- Android and Web can run on same Linux agent
- iOS requires dedicated macOS agent

### Build Caching

Speed up builds by caching:

**Android:**
```gradle
android {
    buildCache {
        local {
            enabled = true
        }
    }
}
```

**Flutter:**
```bash
# Cache pub dependencies
flutter pub cache repair
```

### Incremental Builds

Enable in Jenkins:
- Use workspace caching
- Don't run `flutter clean` unless necessary
- Cache Docker layers (if using Docker)

## Security Best Practices

### Signing Keys

- Store Android keystore securely
- Never commit signing keys to Git
- Use Jenkins credentials store
- Rotate keys periodically

### API Keys

- Use environment variables
- Store in Jenkins credentials
- Never hardcode in source
- Use different keys per environment

### Access Control

- Limit who can trigger builds
- Separate dev/prod pipelines
- Use role-based permissions
- Enable audit logging

## Maintenance

### Regular Tasks

- Update Flutter SDK monthly
- Update dependencies: `flutter pub upgrade`
- Clean old artifacts
- Monitor disk space
- Review build logs

### Version Management

Update version in `pubspec.yaml`:

```yaml
version: 1.0.0+1  # version+build_number
```

Or use build number from Jenkins:

```bash
flutter build apk --build-number=${BUILD_NUMBER}
```

## Support

### Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Flutter DevTools](https://flutter.dev/docs/development/tools/devtools/overview)
- [Jenkins Pipeline Docs](https://www.jenkins.io/doc/book/pipeline/)

### Getting Help

1. Check console output for errors
2. Review Flutter doctor output
3. Check platform-specific logs:
   - Android: `adb logcat`
   - iOS: Xcode console
   - Web: Browser console

## Next Steps

1. ✅ Set up all three Jenkins pipelines
2. ✅ Configure macOS agent for iOS builds
3. ✅ Set up Firebase/deployment accounts
4. ✅ Configure signing certificates
5. ✅ Test each pipeline with manual builds
6. ✅ Configure automatic deployments
7. ✅ Set up monitoring and notifications
8. ✅ Document platform-specific procedures

---

**Last Updated**: January 7, 2026  
**Platforms**: Android, iOS, Web  
**Flutter Version**: 3.16.0+

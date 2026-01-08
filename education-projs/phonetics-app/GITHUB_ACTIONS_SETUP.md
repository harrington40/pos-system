# GitHub Actions CI/CD Setup

This project uses GitHub Actions for automated builds on free macOS and Linux runners.

## Workflows

Three workflows are configured to build all platforms:

### 1. iOS Build (`.github/workflows/ios.yml`)
- **Runner**: macOS-latest (FREE)
- **Trigger**: Push to main/dev, Pull Requests, Manual
- **Builds**: iOS .app and .ipa (unsigned)
- **Artifacts**: Available for 30 days

### 2. Android Build (`.github/workflows/android.yml`)
- **Runner**: ubuntu-latest (FREE)
- **Trigger**: Push to main/dev, Pull Requests, Manual
- **Builds**: APK (split per ABI) and AAB
- **Artifacts**: Available for 30 days

### 3. Web Build (`.github/workflows/web.yml`)
- **Runner**: ubuntu-latest (FREE)
- **Trigger**: Push to main/dev, Pull Requests, Manual
- **Builds**: Flutter web with HTML renderer
- **Artifacts**: Available for 30 days

## Setup Instructions

### 1. Push to GitHub

If you haven't already pushed to GitHub:

```bash
# Add remote (if not already added)
git remote add origin https://github.com/harrington40/phonetics-app.git

# Push all branches and workflows
git push -u origin main
```

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Workflows will appear automatically
4. Click **Enable workflows** (if prompted)

### 3. View Builds

After pushing code:

1. Go to **Actions** tab
2. You'll see three workflows running:
   - ✅ iOS Build
   - ✅ Android Build
   - ✅ Web Build

### 4. Download Artifacts

After build completes:

1. Click on a workflow run
2. Scroll to **Artifacts** section
3. Download:
   - `ios-build-{number}` - iOS .app and .ipa files
   - `android-apks-{number}` - APK files for Android
   - `android-aab-{number}` - AAB file for Google Play
   - `web-build-{number}` - Web app files

## Manual Trigger

To manually trigger a build:

1. Go to **Actions** tab
2. Select workflow (iOS, Android, or Web)
3. Click **Run workflow** button
4. Select branch
5. Click **Run workflow**

## Build Status Badges

Add these to your README.md:

```markdown
![iOS Build](https://github.com/harrington40/phonetics-app/workflows/iOS%20Build/badge.svg)
![Android Build](https://github.com/harrington40/phonetics-app/workflows/Android%20Build/badge.svg)
![Web Build](https://github.com/harrington40/phonetics-app/workflows/Web%20Build/badge.svg)
```

## Free Usage Limits

GitHub Actions free tier includes:
- **2,000 minutes/month** for private repos
- **Unlimited** for public repos
- **macOS runners**: 10x multiplier (1 min = 10 mins)
- **Linux runners**: 1x multiplier

**Example usage:**
- iOS build: ~10 minutes = 100 minutes charged
- Android build: ~5 minutes = 5 minutes charged
- Web build: ~3 minutes = 3 minutes charged
- **Total per full build**: ~108 minutes charged

**Builds per month (free tier):**
- ~18 full builds per month
- More if repo is public (unlimited)

## Workflow Features

### Automatic Triggers
- ✅ Push to main or dev branch
- ✅ Pull requests to main
- ✅ Manual workflow dispatch

### Build Steps
1. Checkout code
2. Setup Flutter
3. Install dependencies
4. Run code analysis
5. Run tests
6. Build for platform
7. Upload artifacts

### Artifact Retention
- Stored for 30 days
- Download anytime during retention period
- Automatically cleaned up after 30 days

## Comparing with Jenkins

| Feature | GitHub Actions | Jenkins |
|---------|---------------|---------|
| **iOS Builds** | ✅ Free macOS runners | ❌ Requires Mac hardware |
| **Android Builds** | ✅ Free Linux runners | ✅ Works on Linux agents |
| **Web Builds** | ✅ Free Linux runners | ✅ Works on Linux agents |
| **Cost** | Free (2000 min/month) | Infrastructure cost |
| **Setup** | 5 minutes | 1-2 hours |
| **Maintenance** | Zero | Medium |
| **Customization** | Good | Excellent |

## Using Both Jenkins and GitHub Actions

**Recommended approach:**

- **Jenkins**: Backend API, Docker builds, deployments
- **GitHub Actions**: iOS, Android, Web mobile builds

Both can run simultaneously:
- Jenkins handles server-side builds
- GitHub Actions handles mobile/web builds
- Best of both worlds!

## Troubleshooting

### Workflow not running?
- Check if Actions are enabled in repo settings
- Verify branch name matches trigger (main/dev)
- Check workflow file syntax

### Build fails?
- Click on failed step to see logs
- Check Flutter version compatibility
- Verify pubspec.yaml dependencies

### Artifacts not uploading?
- Check build path in workflow
- Verify artifact exists before upload
- Check artifact retention settings

## Next Steps

1. ✅ Push workflows to GitHub
2. ✅ Watch builds run automatically
3. ✅ Download artifacts
4. ✅ Test on devices
5. ✅ Configure signing for release builds (optional)

## Advanced: Add Code Signing

For production iOS/Android releases, add secrets:

**iOS:**
```yaml
- name: Import signing certificate
  env:
    CERTIFICATE_BASE64: ${{ secrets.IOS_CERTIFICATE_BASE64 }}
    P12_PASSWORD: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
  run: |
    # Import certificate for signing
    # (requires certificate and provisioning profile)
```

**Android:**
```yaml
- name: Sign APK
  env:
    KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
    KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: |
    # Sign APK with keystore
```

---

**You now have FREE iOS builds without owning a Mac!** 🎉

Just push your code to GitHub and the workflows will build iOS, Android, and Web automatically.

# TradeShield - Packaging & Distribution Guide

## Current Version: 1.0.0

### Table of Contents
1. [Release Preparation](#release-preparation)
2. [Packaging Options](#packaging-options)
3. [Chrome Web Store Distribution](#chrome-web-store-distribution)
4. [Manual Distribution](#manual-distribution)
5. [Version Management](#version-management)
6. [Security & Signing](#security--signing)

---

## Release Preparation

### Pre-Release Checklist
Before any release, complete these steps:

```bash
# 1. Update version number in manifest.json
# Current: "version": "1.0.0"

# 2. Build the extension
cd extension
npm run build

# 3. Verify build output
ls extension/dist/

# 4. Test in Chrome locally
# - Load unpacked from extension/dist/
# - Test all features:
#   ✓ Ad blocking works
#   ✓ Popup displays correctly
#   ✓ Blocked details page shows modern design
#   ✓ Options page functional
#   ✓ Tracking toggles work
#   ✓ ML classifier working
#   ✓ No console errors

# 5. Git tag the release
git tag v1.0.0
git push origin v1.0.0

# 6. Create release notes
```

### Version Numbering Scheme
Follow **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes, major features (1.0.0, 2.0.0)
- **MINOR**: New features, backward compatible (1.1.0, 1.2.0)
- **PATCH**: Bug fixes (1.0.1, 1.0.2)

Examples:
```
1.0.0  → Initial release
1.1.0  → Add new tracking category
1.0.1  → Fix ML percentage bug
2.0.0  → Major redesign (breaking changes)
```

---

## Packaging Options

### Option 1: Chrome Web Store (RECOMMENDED - Professional)
**Best For**: Maximum reach, automatic updates, professional distribution

**Package Format**: `.crx` file (automatically handled by Chrome Web Store)

**Steps**:
1. Create developer account at [Chrome Web Store](https://chrome.google.com/webstore/devconsole)
2. Pay $5 one-time registration fee
3. Upload extension package (see below)
4. Submit for review (1-3 hours approval time)
5. Extension auto-updates for all users

**Package Contents**:
```
TradeShield-1.0.0.zip
├── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── injector.js
│   │   └── ad-blocker.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── popup.css
│   │   ├── blocked-details.html
│   │   └── blocked-details.js
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   ├── welcome.html
│   │   └── welcome.js
│   └── assets/
│       ├── icons/
│       └── images/
└── README.md (required for store)
```

---

### Option 2: GitHub Releases (Free - Open Source)
**Best For**: Open-source projects, transparency, community contribution

**Package Format**: `.zip` archive with source code

**Steps**:
1. Create GitHub repository (if not already done)
2. Build extension: `npm run build`
3. Create GitHub release with version tag
4. Upload `extension/dist` as `.zip` artifact
5. Users download `.zip` and load unpacked

**Package Contents**: Same as Option 1

---

### Option 3: Direct Distribution (Self-Hosted)
**Best For**: Enterprise customers, custom deployments

**Package Formats**:
- `.crx` file (for direct installation)
- `.zip` archive (for manual installation)
- Custom installer with auto-update mechanism

---

## Chrome Web Store Distribution

### Detailed Steps for Web Store Submission

#### Step 1: Developer Account Setup
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with Google account
3. Pay $5 registration fee
4. Verify email address

#### Step 2: Create Application Package

Create a `.zip` file with your extension (use the `dist/` folder):

```powershell
# In PowerShell
cd c:\Users\harri\designProject2020\adblocker-redesigned\extension

# Build first
npm run build

# Create distribution zip
$version = "1.0.0"
Compress-Archive -Path dist/* -DestinationPath "..\TradeShield-$version.zip"
```

#### Step 3: Prepare Store Listing

**Required Information**:

- **Extension Name**: TradeShield - Advanced Threat Protection
- **Version**: 1.0.0
- **Category**: Productivity
- **Description** (short, 132 chars):
  ```
  Enterprise-grade protection against ads, trackers, and digital threats with AI-powered detection
  ```

- **Detailed Description** (up to 10,000 chars):
  ```
  TradeShield provides advanced protection against:
  
  ✅ Ads & Banners - Block all ad networks and display ads
  ✅ Trackers - Stop 30+ tracking services (Google Analytics, Facebook pixels, etc.)
  ✅ Fingerprinting - Prevent device identification and profiling
  ✅ Social Tracking - Block platform tracking widgets
  ✅ Analytics - Protect privacy from analytics services
  
  FEATURES:
  • AI-powered URL classification with configurable confidence threshold
  • Real-time blocking with detailed statistics
  • 35+ hardcoded ad domain list
  • Wildcard pattern support
  • Custom whitelist management
  • Granular tracking control (5 independent categories)
  • Professional blocked threats report
  • Dark modern UI with enterprise design
  
  PRIVACY:
  • No data collection or tracking
  • Open-source algorithm
  • Works entirely offline
  • No registration required
  
  STATUS: Beta - Enterprise Release
  ```

- **Screenshots** (1280x800px minimum):
  1. Main popup showing stats
  2. Blocked details page with modern design
  3. Options page with tracking controls
  4. Example blocking in action

- **Logo** (128x128px minimum):
  - Use the TradeShield TT logo (blue-cyan gradient)

- **Category**: Productivity
- **Language**: English

#### Step 4: Privacy Policy

**Required Privacy Policy** (upload or link):

```markdown
# TradeShield Privacy Policy

## Data Collection
TradeShield does NOT collect any personal data. The extension operates entirely offline.

## What We Track Locally
- Blocked URL history (stored locally in browser, user can clear)
- User preferences (tracking toggles, ML threshold)
- Statistics (block counts, confidence scores)

All data stays on your computer. Nothing is sent to external servers.

## Permissions Explained
- storage: To save user preferences and blocked history
- webRequest/declarativeNetRequest: To block requests
- tabs: To check current tab URL
- scripting: To inject ad-blocking script
- webNavigation: To detect page navigations

## Contact
For privacy concerns: [your email]

Last Updated: November 24, 2025
```

#### Step 5: Upload & Submit

1. In Chrome Web Store dashboard, click "New Item"
2. Upload the `.zip` file
3. Fill in all listing details above
4. Add screenshots and logo
5. Set regions/countries for distribution
6. **Submit for Review**

**Review Time**: Usually 1-3 hours
**Approval Rate**: ~95% (follow policies)

---

## Manual Distribution

### For Users Who Want to Install Locally

**Instructions for Users**:

```markdown
# Installation Instructions

## Method 1: Load Unpacked (Development)

1. Download the extension ZIP file
2. Extract to any folder
3. Open Chrome and go to: chrome://extensions/
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the extracted extension folder
7. Click "Open"

TradeShield should now appear in your extensions!

## Method 2: Load CRX File (If Provided)

1. Download the .crx file
2. Open Chrome: chrome://extensions/
3. Drag the .crx file onto the page
4. Click "Add extension"

Done! TradeShield is installed.
```

---

## Version Management

### Versioning Files

Update these files for each release:

```json
// manifest.json
{
  "version": "1.0.0"  // ← Update here
}
```

```javascript
// package.json
{
  "version": "1.0.0"  // ← Update here
}
```

### Version History Template

Create `VERSION_HISTORY.md`:

```markdown
# TradeShield Version History

## v1.0.0 (November 24, 2025) - Initial Release
**Features**:
- ✅ Hybrid pattern + ML-based ad blocking
- ✅ 35+ ad domains
- ✅ 5 tracking categories (analytics, pixels, fingerprinting, social, general)
- ✅ Real-time statistics and blocked threats report
- ✅ Modern dark UI with TradeShield branding
- ✅ ML confidence threshold slider (0.5-0.95)
- ✅ Custom whitelist management

**Bug Fixes**:
- Fixed browser unresponsiveness on extension load
- Fixed ML percentage calculation
- Fixed CSP violations
- Fixed service worker registration

**Known Issues**:
- None

---

## v1.1.0 (Future) - Enhanced Filtering
**Planned Features**:
- Custom blocklist import/export
- Advanced regex support
- Performance profiling dashboard
- Blocklist subscription management
```

---

## Security & Signing

### Code Signing (Optional for Distribution)

For enterprise distribution, you may want to sign the extension:

```bash
# Generate private key (do this ONCE and save safely)
openssl genrsa -out private-key.pem 2048

# Sign the extension package
openssl dgst -sha256 -sign private-key.pem -out TradeShield-1.0.0.crx TradeShield-1.0.0.zip
```

### Security Checklist

Before releasing:

```
☐ No hardcoded API keys or secrets
☐ All external scripts loaded from trusted sources only
☐ No eval() or dangerous functions
☐ Content Security Policy enforced
☐ No telemetry or tracking of users
☐ No ads in the extension itself
☐ Permissions minimized and justified
☐ Code reviewed for vulnerabilities
☐ Tested on latest Chrome version
☐ Privacy policy clear and accurate
```

---

## Distribution Timeline

### Immediate (Current)
- [x] Build extension locally: `npm run build`
- [x] Test thoroughly in Chrome
- [x] Create version control (git tags)

### Short Term (Next Week)
- [ ] Create Chrome Web Store developer account
- [ ] Prepare all store listing materials
- [ ] Create privacy policy
- [ ] Generate screenshots and logo
- [ ] Submit for review

### Medium Term (After Approval)
- [ ] Monitor user reviews and feedback
- [ ] Fix any reported bugs (v1.0.1)
- [ ] Plan next features (v1.1.0)
- [ ] Publish updates as needed

### Long Term
- [ ] Build user base and gather reviews
- [ ] Implement feature requests
- [ ] Consider Firefox/Edge versions
- [ ] Create landing page/website

---

## Quick Distribution Commands

```bash
# Build extension
cd extension
npm run build

# Create release package
$version = "1.0.0"
Compress-Archive -Path dist/* -DestinationPath "..\TradeShield-$version.zip"

# Create git release tag
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release (requires GitHub CLI)
gh release create v1.0.0 TradeShield-1.0.0.zip --title "v1.0.0 - Initial Release"
```

---

## Support & Updates

### Post-Release Support
1. **Monitor Reviews**: Check Chrome Web Store for user feedback
2. **Respond to Issues**: Address bugs reported in reviews
3. **Update Schedule**: Security patches immediately, features quarterly
4. **Communication**: Keep users informed via release notes

### Auto-Update Mechanism
Chrome Web Store automatically handles updates:
- Users receive updates automatically
- No action needed from users
- Update rolls out over 24-48 hours

---

## Checklist for v1.0.0 Release

**Pre-Release**:
- [ ] All features tested and working
- [ ] No console errors in popup/options/blocked-details
- [ ] Blocking working on test sites (YouTube, news sites)
- [ ] ML threshold slider functional
- [ ] Tracking toggles working
- [ ] Export buttons working
- [ ] Modern TradeShield design displaying correctly
- [ ] Build succeeds: `npm run build`
- [ ] Git committed and tagged

**Store Submission**:
- [ ] Developer account created
- [ ] Privacy policy written
- [ ] Screenshots prepared (1280x800px)
- [ ] Logo prepared (128x128px)
- [ ] Description written
- [ ] Package created and tested
- [ ] Submitted for review

**Post-Launch**:
- [ ] Monitor reviews
- [ ] Respond to feedback
- [ ] Track download metrics
- [ ] Plan next version

---

**Ready to distribute?** Start with Chrome Web Store - it's the most professional and reaches the most users!

Last Updated: November 24, 2025

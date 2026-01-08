# Manual Jenkins Pipeline Creation Guide

If the automated script doesn't work, follow these steps to manually create each pipeline in Jenkins.

## Step-by-Step Instructions

### 1. Access Jenkins
Open your browser and navigate to:
```
https://jenkins.transtechologies.com
```
Log in with your credentials.

---

## Create Backend Pipeline

### Job Name: `Phonetics-App-Backend`

1. Click **"New Item"** (top left)
2. Enter name: `Phonetics-App-Backend`
3. Select **"Pipeline"**
4. Click **"OK"**

**Configuration:**

- **Description**: `Backend API build and deployment pipeline`

- **Build Triggers**:
  - ☑ Poll SCM
  - Schedule: `H/5 * * * *`

- **Pipeline**:
  - Definition: `Pipeline script from SCM`
  - SCM: `Git`
  - Repository URL: `YOUR_GIT_REPO_URL`
  - Credentials: Select appropriate credentials (or add new)
  - Branch Specifier: `*/main`
  - Script Path: `Jenkinsfile`

- Click **"Save"**

---

## Create Android Pipeline

### Job Name: `Phonetics-App-Android`

1. Click **"New Item"**
2. Enter name: `Phonetics-App-Android`
3. Select **"Pipeline"**
4. Click **"OK"**

**Configuration:**

- **Description**: `Android APK/AAB build pipeline`

- **Build Triggers**:
  - ☑ Poll SCM
  - Schedule: `H/5 * * * *`

- **Pipeline**:
  - Definition: `Pipeline script from SCM`
  - SCM: `Git`
  - Repository URL: `YOUR_GIT_REPO_URL`
  - Credentials: Same as above
  - Branch Specifier: `*/main`
  - Script Path: `Jenkinsfile.android`

- Click **"Save"**

---

## Create iOS Pipeline

### Job Name: `Phonetics-App-iOS`

1. Click **"New Item"**
2. Enter name: `Phonetics-App-iOS`
3. Select **"Pipeline"**
4. Click **"OK"**

**Configuration:**

- **Description**: `iOS IPA build pipeline (requires macOS agent)`

- **General**:
  - ☑ Restrict where this project can be run
  - Label Expression: `macos`

- **Build Triggers**:
  - ☑ Poll SCM
  - Schedule: `H/5 * * * *`

- **Pipeline**:
  - Definition: `Pipeline script from SCM`
  - SCM: `Git`
  - Repository URL: `YOUR_GIT_REPO_URL`
  - Credentials: Same as above
  - Branch Specifier: `*/main`
  - Script Path: `Jenkinsfile.ios`

- Click **"Save"**

---

## Create Web Pipeline

### Job Name: `Phonetics-App-Web`

1. Click **"New Item"**
2. Enter name: `Phonetics-App-Web`
3. Select **"Pipeline"**
4. Click **"OK"**

**Configuration:**

- **Description**: `Flutter Web build pipeline`

- **Build Triggers**:
  - ☑ Poll SCM
  - Schedule: `H/5 * * * *`

- **Pipeline**:
  - Definition: `Pipeline script from SCM`
  - SCM: `Git`
  - Repository URL: `YOUR_GIT_REPO_URL`
  - Credentials: Same as above
  - Branch Specifier: `*/main`
  - Script Path: `Jenkinsfile.web`

- Click **"Save"**

---

## Verify Setup

After creating all pipelines:

1. Go to Jenkins Dashboard
2. You should see 4 jobs:
   - ✅ Phonetics-App-Backend
   - ✅ Phonetics-App-Android
   - ✅ Phonetics-App-iOS
   - ✅ Phonetics-App-Web

---

## Create Dashboard View (Optional)

To see all pipelines in one view:

1. Click **"+"** tab or **"New View"**
2. View name: `Phonetics App Builds`
3. Type: **"List View"**
4. Click **"OK"**

**Configuration:**
- **Job Filters**:
  - ☑ Add jobs to the view
  - Select all 4 Phonetics-App jobs
- **Columns**:
  - Status
  - Weather
  - Name
  - Last Success
  - Last Failure
  - Last Duration
  - Build Button

- Click **"OK"**

---

## Test the Pipelines

### Manual Test Build

For each pipeline:
1. Click on the job name
2. Click **"Build Now"**
3. Wait for build to start
4. Click on build number (e.g., `#1`)
5. Click **"Console Output"** to watch progress

### Expected First Build Times

- Backend: ~2-5 minutes
- Android: ~5-10 minutes
- iOS: ~10-15 minutes (requires macOS agent)
- Web: ~3-7 minutes

---

## Configure Git Webhook (Recommended)

Instead of polling, use webhooks for instant builds:

### In GitHub:

1. Go to repository **Settings**
2. Click **Webhooks** → **Add webhook**
3. **Payload URL**: `https://jenkins.transtechologies.com/github-webhook/`
4. **Content type**: `application/json`
5. **Events**: Select "Just the push event"
6. Click **"Add webhook"**

### In Jenkins (for each job):

1. Edit job configuration
2. **Build Triggers**:
   - ☑ GitHub hook trigger for GITScm polling
   - Remove or disable "Poll SCM" if webhook works
3. Click **"Save"**

Now builds will trigger automatically on Git push!

---

## Troubleshooting

### "No valid crumb was included in the request"
- Enable CSRF protection in Jenkins security settings
- Or use API token instead of password

### "Permission denied"
- Ensure your user has permission to create jobs
- Check "Manage Jenkins" → "Manage Users" → Your user → Configure

### "Git repository not found"
- Verify repository URL is correct
- Check credentials are properly configured
- For private repos, add SSH key or personal access token

### iOS pipeline shows "No agents available"
- macOS agent not configured
- Check "Manage Jenkins" → "Manage Nodes and Clouds"
- Ensure macOS agent is online and labeled as "macos"

---

## Quick Reference

| Pipeline | Jenkinsfile | Platform | Agent |
|----------|------------|----------|-------|
| Backend | `Jenkinsfile` | API/Docker | any |
| Android | `Jenkinsfile.android` | Mobile | any |
| iOS | `Jenkinsfile.ios` | Mobile | macOS |
| Web | `Jenkinsfile.web` | Browser | any |

---

## Next Steps

After all pipelines are created:

1. ✅ Configure deployment credentials
2. ✅ Set up email/Slack notifications
3. ✅ Configure code signing (Android/iOS)
4. ✅ Set up artifact storage
5. ✅ Run test builds on all pipelines
6. ✅ Document any custom configurations

---

**Need Help?**
- Check console output for detailed error messages
- Review Jenkins system log: Manage Jenkins → System Log
- Consult JENKINS_SETUP.md and MULTI_PLATFORM_BUILD_GUIDE.md

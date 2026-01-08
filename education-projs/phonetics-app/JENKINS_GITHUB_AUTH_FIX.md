# Jenkins GitHub Authentication Fix

## Problem
Jenkins cannot access the GitHub repository because it needs authentication credentials.

## Solution: Add GitHub Credentials to Jenkins

### Step 1: Add Credentials to Jenkins

1. **Go to Jenkins**: https://jenkins.transtechologies.com
2. **Manage Jenkins** → **Manage Credentials**
3. Click **(global)** domain
4. Click **Add Credentials** (left side)

### Step 2: Configure GitHub Personal Access Token

Fill in the form:

- **Kind**: `Username with password`
- **Scope**: `Global`
- **Username**: `harrington40`
- **Password**: `YOUR_GITHUB_PERSONAL_ACCESS_TOKEN` (use the token from hr project or create new one)
- **ID**: `github-credentials`
- **Description**: `GitHub Personal Access Token for phonetics-app`

Click **Create**

### Step 3: Update Each Pipeline Job

For each pipeline (Backend, Android, Web):

1. **Click on job name** (e.g., Phonetics-App-Backend)
2. **Configure**
3. Scroll to **Pipeline** section
4. Under **SCM**: Git
5. Find **Credentials** dropdown
6. Select: `harrington40/****** (GitHub Personal Access Token for phonetics-app)`
7. Click **Save**

Repeat for:
- Phonetics-App-Backend
- Phonetics-App-Android
- Phonetics-App-Web
- Phonetics-App-iOS (if created)

### Step 4: Trigger Build

1. Go to any pipeline job
2. Click **Build Now**
3. Should work now! ✅

## Alternative: Quick Fix via Configuration File

If you have Jenkins CLI access, you can also add credentials via script:

```groovy
import jenkins.model.Jenkins
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.domains.Domain

def jenkins = Jenkins.instance
def domain = Domain.global()
def store = jenkins.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()

def credentials = new UsernamePasswordCredentialsImpl(
    CredentialsScope.GLOBAL,
    "github-credentials",
    "GitHub Personal Access Token",
    "harrington40",
    "YOUR_GITHUB_PAT_TOKEN_HERE"
)

store.addCredentials(domain, credentials)
println "GitHub credentials added successfully!"
```

## Verify Fix

After adding credentials and updating jobs:

1. Go to **Phonetics-App-Backend** (or any job)
2. Click **Build Now**
3. Check **Console Output**
4. Should see: `git fetch` succeeding
5. Pipeline should run successfully

## Security Note

⚠️ The GitHub token in this guide is from your hr project. If you want a separate token for this project:

1. Go to GitHub: https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes: `repo` (full control)
4. Copy token
5. Use in Jenkins credentials instead

---

**After this fix, all Jenkins pipelines will be able to access GitHub!**

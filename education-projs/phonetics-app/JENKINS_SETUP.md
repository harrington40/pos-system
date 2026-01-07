# Jenkins CI/CD Setup for Phonetics Learning App

This guide explains how to set up Jenkins CI/CD for the Phonetics Learning App.

## Jenkins Server Information
- **URL**: https://jenkins.transtechologies.com/
- **Pipeline**: Declarative pipeline using Jenkinsfile
- **Based on**: HRMS Jenkins architecture (proven and hardened)

## Quick Setup

### 1. Access Jenkins Server
1. Open https://jenkins.transtechologies.com/
2. Login with your credentials

### 2. Create New Pipeline Job
1. Click "New Item"
2. Enter job name: **"Phonetics-App-CI-CD"**
3. Select "Pipeline"
4. Click "OK"

### 3. Configure Pipeline
In the pipeline configuration:

**General Settings:**
- ✓ GitHub project (optional): `https://github.com/yourusername/phonetics-app`
- ✓ Discard old builds: Keep last 10 builds

**Build Triggers:**
- ✓ Poll SCM: `H/5 * * * *` (checks every 5 minutes)
- OR ✓ GitHub hook trigger for GITScm polling (preferred)

**Pipeline:**
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: Your Git repository URL
- **Credentials**: Select appropriate credentials
- **Branch Specifier**: `*/main` (or `*/dev` for development)
- **Script Path**: `Jenkinsfile`

### 4. Required Jenkins Plugins

Run the installation script:
```bash
bash jenkins-plugins-install.sh
```

Or manually install these plugins:
- Pipeline
- Pipeline: GitHub Groovy Libraries
- Git
- Docker Pipeline
- HTML Publisher
- SSH Agent
- Blue Ocean (optional, for better UI)

### 5. Configure Credentials

Add these credentials in Jenkins (Manage Jenkins → Credentials):

#### Docker Hub Credentials
- **Type**: Username with password
- **Scope**: Global
- **Username**: Your Docker Hub username
- **Password**: Docker Hub access token
- **ID**: `dockerhub-credentials`
- **Description**: Docker Hub for image push

#### GitHub Credentials (if private repo)
- **Type**: SSH Username with private key
- **Scope**: Global
- **Username**: git
- **Private Key**: Your GitHub SSH private key
- **ID**: `github-ssh-key`
- **Description**: GitHub SSH access

### 6. Environment Setup

Ensure Jenkins agent has these installed:

**Required:**
- Docker (latest)
- Python 3.11+
- Git
- curl

**Optional (for extended features):**
- Node.js (for Flutter web)
- Flutter SDK (for Flutter builds)
- PostgreSQL client (for database migrations)

#### Installation Commands (Ubuntu/Debian)
```bash
# Docker
sudo apt-get update
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins
sudo systemctl restart docker

# Python 3.11
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Git
sudo apt-get install -y git

# Restart Jenkins
sudo systemctl restart jenkins
```

## Pipeline Stages

The Jenkinsfile includes these stages:

### 1. **Pipeline Info**
- Displays build information
- Shows Git commit details
- Lists workspace contents

### 2. **Checkout**
- Checks out code from Git
- Validates repository state

### 3. **Validate Environment**
- Checks Python installation
- Verifies required files exist
- Checks disk space

### 4. **Setup Backend Environment**
- Creates Python virtual environment
- Installs dependencies from requirements.txt
- Verifies critical packages (FastAPI, Uvicorn)

### 5. **Security Scan**
- Runs Bandit (Python security linter)
- Runs Safety (dependency vulnerability scanner)
- Generates security reports

### 6. **Backend Lint & Test**
- Runs Flake8 (code linting)
- Runs pytest (unit tests)
- Generates code coverage report

### 7. **Backend Build**
- Builds Docker image
- Tags with build number and 'latest'

### 8. **Integration Test**
- Starts backend service
- Tests API endpoints (/api/lesson, /api/health)
- Verifies service responses

### 9. **Push Docker Images** (main branch only)
- Pushes to Docker Hub (when configured)
- Tags: `{branch}-{build_number}` and `latest`

### 10. **Deploy to Dev** (dev branch only)
- Runs docker-compose
- Starts all services
- Verifies deployment

### 11. **Health Check**
- Performs service health checks
- Retries up to 10 times
- Ensures services are responsive

## Post-Build Actions

### Success
- Archives build status
- Saves Docker image information
- Publishes reports

### Failure
- Collects error logs
- Archives debugging information
- Shows failure details

### Always
- Archives security scan results
- Publishes HTML reports
- Publishes code coverage

### Cleanup
- Kills background processes
- Removes temporary files
- Cleans workspace

## GitHub Webhook Setup (Recommended)

### Configure GitHub Webhook
1. Go to your GitHub repository
2. Settings → Webhooks → Add webhook
3. **Payload URL**: `https://jenkins.transtechologies.com/github-webhook/`
4. **Content type**: `application/json`
5. **Events**: 
   - ✓ Push events
   - ✓ Pull request events
6. Click "Add webhook"

### Configure Jenkins Job
1. In job configuration
2. Build Triggers section
3. ✓ Check "GitHub hook trigger for GITScm polling"
4. Save configuration

## Running the Pipeline

### Manual Build
1. Open your Jenkins job
2. Click "Build Now"
3. Monitor the build in "Build History"
4. Click on build number to see console output

### Automatic Build
- **Webhook**: Builds automatically on Git push
- **Polling**: Jenkins checks for changes every 5 minutes

## Monitoring Builds

### Build Status
- **Blue ball** 🔵: Build in progress
- **Green ball** 🟢: Build successful
- **Red ball** 🔴: Build failed
- **Yellow ball** 🟡: Build unstable

### View Reports
After build completes:
1. Click on build number
2. Left sidebar shows available reports:
   - Security Scan Report
   - Code Coverage Report
   - Build Artifacts

### Console Output
- Click build number
- Click "Console Output"
- Shows detailed build logs

## Branch Strategy

### Main Branch
- Full pipeline execution
- Docker image push (when configured)
- Tagged as production-ready

### Dev Branch
- Full pipeline execution
- Deploys to dev environment
- No Docker push

### Feature Branches
- Runs tests and security scans
- No deployment
- Validates code quality

## Troubleshooting

### Common Issues

#### Build Fails at "Setup Backend Environment"
**Problem**: Virtual environment creation fails
**Solution**:
```bash
# On Jenkins agent:
sudo apt-get install -y python3.11-venv
```

#### Docker Build Fails
**Problem**: Docker daemon not accessible
**Solution**:
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

#### Permission Denied Errors
**Problem**: Jenkins user lacks permissions
**Solution**:
```bash
sudo chown -R jenkins:jenkins /var/lib/jenkins/workspace/
```

#### Git Authentication Fails
**Problem**: Can't access private repository
**Solution**:
- Add SSH key or personal access token in Jenkins credentials
- Configure credential ID in job settings

### View Logs

**Jenkins logs:**
```bash
sudo tail -f /var/log/jenkins/jenkins.log
```

**Build logs:**
- Console Output in Jenkins UI
- Archived in build artifacts

**Backend logs:**
```bash
cat /tmp/jenkins-backend.log
```

## Advanced Configuration

### Parallel Execution
Modify Jenkinsfile to run tests in parallel:
```groovy
stage('Tests') {
    parallel {
        stage('Unit Tests') {
            steps {
                // unit test commands
            }
        }
        stage('Integration Tests') {
            steps {
                // integration test commands
            }
        }
    }
}
```

### Email Notifications
Add to pipeline post section:
```groovy
post {
    failure {
        emailext (
            subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: "Check console output at ${env.BUILD_URL}",
            to: 'team@example.com'
        )
    }
}
```

### Slack Notifications
Install Slack Notification plugin and add:
```groovy
post {
    success {
        slackSend channel: '#builds',
                  color: 'good',
                  message: "Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
}
```

## Maintenance

### Regular Tasks
- Update Jenkins and plugins monthly
- Review and clean old builds
- Monitor disk space usage
- Rotate credentials quarterly

### Backup Jenkins Configuration
```bash
# Backup Jenkins home
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins/

# Backup just jobs
sudo tar -czf jenkins-jobs-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins/jobs/
```

## Performance Tips

### Speed Up Builds
1. Use Docker layer caching
2. Cache Python dependencies
3. Run tests in parallel
4. Use faster build agents

### Resource Management
- Set appropriate timeout values
- Limit concurrent builds
- Clean workspace after builds
- Monitor memory usage

## Security Best Practices

### Credentials
- Never hardcode secrets
- Use Jenkins credentials store
- Rotate credentials regularly
- Use different credentials per environment

### Access Control
- Enable security in Jenkins
- Use role-based access control
- Limit job permissions
- Enable audit logging

### Network Security
- Use HTTPS for Jenkins access
- Configure firewall rules
- Use VPN for internal access
- Restrict webhook IPs if possible

## Support

### Getting Help
1. Check console output for error messages
2. Review Jenkins system logs
3. Check build artifacts for reports
4. Consult Jenkins documentation at jenkins.io

### Useful Jenkins Commands
```bash
# Restart Jenkins
sudo systemctl restart jenkins

# Check Jenkins status
sudo systemctl status jenkins

# View Jenkins logs
sudo journalctl -u jenkins -f

# Test webhook
curl -X POST https://jenkins.transtechologies.com/github-webhook/
```

## Files in This Repository

- **Jenkinsfile**: Main pipeline definition
- **jenkins-plugins-install.sh**: Plugin installation script
- **setup-jenkins-pipelines.sh**: Pipeline setup automation
- **Jenkinsfile.hr-template**: Reference template from HRMS project
- **JENKINS_SETUP.md**: This documentation

## Migration Notes

This pipeline is based on the proven HRMS Jenkins architecture with:
- ✅ Hardened error handling (set +e where appropriate)
- ✅ Comprehensive logging
- ✅ Security scanning integrated
- ✅ Docker build and push capabilities
- ✅ Multi-stage validation
- ✅ Proper cleanup procedures

## Next Steps

1. ✅ Review and customize Jenkinsfile for your needs
2. ✅ Set up Jenkins job as described above
3. ✅ Configure credentials
4. ✅ Test with a manual build
5. ✅ Set up GitHub webhook for automation
6. ✅ Monitor first few builds closely
7. ✅ Adjust configuration as needed

---

**Last Updated**: January 7, 2026  
**Based On**: HRMS Jenkins Architecture (proven in production)  
**Maintained By**: DevOps Team

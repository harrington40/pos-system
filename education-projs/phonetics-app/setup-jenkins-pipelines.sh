#!/bin/bash

###############################################################################
# Jenkins Multi-Environment Setup Script
# This script helps set up the three Jenkins pipelines
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Jenkins Multi-Environment Pipeline Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${GREEN}▶ $1${NC}"
    echo "────────────────────────────────────────────────────"
}

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 not found"
        return 1
    fi
}

# Check Jenkins Pipeline Files
print_section "Checking Jenkins Pipeline Files"
check_file "Jenkinsfile.test" || exit 1
check_file "Jenkinsfile.staging" || exit 1
check_file "Jenkinsfile.production" || exit 1

# Check Required Application Files
print_section "Checking Application Files"
check_file "main.py" || exit 1
check_file "requirements.txt" || exit 1
check_file "Dockerfile" || exit 1
check_file "docker-compose.yml" || exit 1

# Create Environment Configuration Files
print_section "Creating Environment Configuration Files"

# Test Environment Config
echo -e "  Creating ${YELLOW}config/test.env${NC}"
cat > config/test.env <<'EOF'
# Test Environment Configuration
ENVIRONMENT=test
ORIENTDB_HOST=orientdb-test.company.local
ORIENTDB_PORT=2424
ORIENTDB_DATABASE=hrms_test
APP_HOST=0.0.0.0
APP_PORT=8081
LOG_LEVEL=DEBUG
EOF
echo -e "  ${GREEN}✓${NC} config/test.env created"

# Staging Environment Config
echo -e "  Creating ${YELLOW}config/staging.env${NC}"
cat > config/staging.env <<'EOF'
# Staging Environment Configuration
ENVIRONMENT=staging
ORIENTDB_HOST=orientdb-staging.company.local
ORIENTDB_PORT=2424
ORIENTDB_DATABASE=hrms_staging
APP_HOST=0.0.0.0
APP_PORT=8082
LOG_LEVEL=INFO
EOF
echo -e "  ${GREEN}✓${NC} config/staging.env created"

# Production Environment Config
echo -e "  Creating ${YELLOW}config/production.env${NC}"
cat > config/production.env <<'EOF'
# Production Environment Configuration
ENVIRONMENT=production
ORIENTDB_HOST=orientdb-prod.company.local
ORIENTDB_PORT=2424
ORIENTDB_DATABASE=hrms_production
APP_HOST=0.0.0.0
APP_PORT=8080
LOG_LEVEL=WARNING
MONITORING_ENABLED=true
EOF
echo -e "  ${GREEN}✓${NC} config/production.env created"

# Create Deployment Scripts
print_section "Creating Deployment Helper Scripts"

# Create deploy-test.sh
echo -e "  Creating ${YELLOW}scripts/deploy-test.sh${NC}"
mkdir -p scripts
cat > scripts/deploy-test.sh <<'EOF'
#!/bin/bash
# Deploy to Test Environment
echo "Deploying to TEST environment..."
pkill -f "uvicorn main:app.*8081" || true
sleep 5
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8081 --env-file config/test.env --reload > logs/test.log 2>&1 &
echo "Test environment deployed on port 8081"
EOF
chmod +x scripts/deploy-test.sh
echo -e "  ${GREEN}✓${NC} scripts/deploy-test.sh created"

# Create deploy-staging.sh
echo -e "  Creating ${YELLOW}scripts/deploy-staging.sh${NC}"
cat > scripts/deploy-staging.sh <<'EOF'
#!/bin/bash
# Deploy to Staging Environment
echo "Deploying to STAGING environment..."
pkill -f "uvicorn main:app.*8082" || true
sleep 5
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8082 --env-file config/staging.env --workers 2 > logs/staging.log 2>&1 &
echo "Staging environment deployed on port 8082"
EOF
chmod +x scripts/deploy-staging.sh
echo -e "  ${GREEN}✓${NC} scripts/deploy-staging.sh created"

# Create deploy-production.sh
echo -e "  Creating ${YELLOW}scripts/deploy-production.sh${NC}"
cat > scripts/deploy-production.sh <<'EOF'
#!/bin/bash
# Deploy to Production Environment
echo "⚠️  PRODUCTION DEPLOYMENT"
echo "Creating backup..."
# Add your backup command here
echo "Deploying to PRODUCTION environment..."
pkill -SIGTERM -f "uvicorn main:app.*8080" || true
sleep 10
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8080 --env-file config/production.env --workers 4 > logs/production.log 2>&1 &
echo "Production environment deployed on port 8080"
EOF
chmod +x scripts/deploy-production.sh
echo -e "  ${GREEN}✓${NC} scripts/deploy-production.sh created"

# Create log directory
print_section "Creating Log Directory"
mkdir -p logs
echo -e "  ${GREEN}✓${NC} logs/ directory created"

# Create backup directory
print_section "Creating Backup Directory"
mkdir -p backups/{test,staging,production}
echo -e "  ${GREEN}✓${NC} backups/ directories created"

# Create test results directory
print_section "Creating Test Results Directory"
mkdir -p test-results
echo -e "  ${GREEN}✓${NC} test-results/ directory created"

# Generate Jenkins Job Configuration Template
print_section "Generating Jenkins Job XML Templates"

cat > jenkins-job-test.xml <<'EOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>HRMS Test Environment Pipeline - Auto-deploys on push to develop branch</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <com.coravy.hudson.plugins.github.GithubProjectProperty>
      <projectUrl>https://github.com/yourusername/hr/</projectUrl>
    </com.coravy.hudson.plugins.github.GithubProjectProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition">
    <scm class="hudson.plugins.git.GitSCM">
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/yourusername/hr.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/develop</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile.test</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers>
    <com.cloudbees.jenkins.GitHubPushTrigger>
      <spec></spec>
    </com.cloudbees.jenkins.GitHubPushTrigger>
  </triggers>
</flow-definition>
EOF
echo -e "  ${GREEN}✓${NC} jenkins-job-test.xml created"

# Summary
print_section "Setup Summary"
echo -e "  ${GREEN}✓${NC} All pipeline files verified"
echo -e "  ${GREEN}✓${NC} Environment configurations created"
echo -e "  ${GREEN}✓${NC} Deployment scripts generated"
echo -e "  ${GREEN}✓${NC} Directory structure initialized"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure Jenkins credentials (dockerhub-credentials)"
echo "  2. Create three Jenkins Pipeline jobs:"
echo "     - HRMS-Test-Pipeline (Jenkinsfile.test)"
echo "     - HRMS-Staging-Pipeline (Jenkinsfile.staging)"
echo "     - HRMS-Production-Pipeline (Jenkinsfile.production)"
echo "  3. Configure GitHub webhook for automatic triggers"
echo "  4. Update email recipients in pipeline files"
echo "  5. Test each pipeline with a sample commit"
echo ""
echo -e "${BLUE}Documentation:${NC} See JENKINS_MULTI_ENV_SETUP.md"
echo ""

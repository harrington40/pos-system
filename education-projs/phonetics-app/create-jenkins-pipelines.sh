#!/bin/bash
# Script to create Jenkins pipeline jobs for Phonetics App
# Run this script on your Jenkins server or use Jenkins CLI

JENKINS_URL="https://jenkins.transtechologies.com"
REPO_URL="https://github.com/harrington40/phonetics-app.git"
BRANCH="main"

echo "=========================================="
echo "Creating Jenkins Pipeline Jobs"
echo "=========================================="
echo ""

# Check if Jenkins CLI is available
if [ ! -f "jenkins-cli.jar" ]; then
    echo "Downloading Jenkins CLI..."
    wget ${JENKINS_URL}/jnlpJars/jenkins-cli.jar -O jenkins-cli.jar
fi

echo "Please enter your Jenkins credentials:"
read -p "Username: " JENKINS_USER
read -sp "Password/Token: " JENKINS_TOKEN
echo ""
echo ""

# Function to create a pipeline job
create_pipeline() {
    local JOB_NAME=$1
    local JENKINSFILE=$2
    local DESCRIPTION=$3
    local AGENT_LABEL=$4
    
    echo "Creating job: ${JOB_NAME}..."
    
    # Create job XML configuration
    cat > /tmp/${JOB_NAME}.xml << EOF
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@2.40">
  <description>${DESCRIPTION}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty/>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.SCMTrigger>
          <spec>H/5 * * * *</spec>
          <ignorePostCommitHooks>false</ignorePostCommitHooks>
        </hudson.triggers.SCMTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps@2.90">
    <scm class="hudson.plugins.git.GitSCM" plugin="git@4.7.1">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${REPO_URL}</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/${BRANCH}</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="list"/>
      <extensions/>
    </scm>
    <scriptPath>${JENKINSFILE}</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
EOF

    # Create the job using Jenkins CLI
    java -jar jenkins-cli.jar -s ${JENKINS_URL} -auth ${JENKINS_USER}:${JENKINS_TOKEN} \
        create-job ${JOB_NAME} < /tmp/${JOB_NAME}.xml
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created: ${JOB_NAME}"
    else
        echo "❌ Failed to create: ${JOB_NAME}"
        echo "   You may need to create it manually in Jenkins UI"
    fi
    echo ""
}

# Create Android Pipeline
create_pipeline \
    "Phonetics-App-Android" \
    "Jenkinsfile.android" \
    "Android APK/AAB build pipeline for Phonetics Learning App" \
    ""

# Create iOS Pipeline
create_pipeline \
    "Phonetics-App-iOS" \
    "Jenkinsfile.ios" \
    "iOS IPA build pipeline for Phonetics Learning App (requires macOS agent)" \
    "macos"

# Create Web Pipeline
create_pipeline \
    "Phonetics-App-Web" \
    "Jenkinsfile.web" \
    "Flutter Web build pipeline for Phonetics Learning App" \
    ""

# Create Backend Pipeline
create_pipeline \
    "Phonetics-App-Backend" \
    "Jenkinsfile" \
    "Backend API build and deployment pipeline for Phonetics Learning App" \
    ""

echo "=========================================="
echo "Pipeline Job Creation Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Open Jenkins: ${JENKINS_URL}"
echo "2. Verify all jobs were created"
echo "3. Configure any additional settings (credentials, etc.)"
echo "4. Run test builds for each pipeline"
echo ""
echo "Jobs created:"
echo "  - Phonetics-App-Android"
echo "  - Phonetics-App-iOS (requires macOS agent setup)"
echo "  - Phonetics-App-Web"
echo "  - Phonetics-App-Backend"
echo ""

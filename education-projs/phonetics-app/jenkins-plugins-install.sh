#!/bin/bash
# Modern Jenkins Plugins Installation Script
# Run this on your Jenkins server to install modern UI plugins

echo "🎨 Installing Modern Jenkins Plugins..."

# Jenkins CLI location
JENKINS_CLI="/var/lib/jenkins/jenkins-cli.jar"
JENKINS_URL="https://jenkins.transtechologies.com/"

# Download Jenkins CLI if not exists
if [ ! -f "$JENKINS_CLI" ]; then
    wget ${JENKINS_URL}jnlpJars/jenkins-cli.jar -O $JENKINS_CLI
fi

# Modern UI Plugins
plugins=(
    "blueocean"                          # Modern Pipeline UI
    "dashboard-view"                     # Customizable Dashboard
    "build-monitor-plugin"               # Build Monitor View
    "radiatorview-plugin"                # Radiator View for Teams
    "statistics"                         # Project Statistics
    "build-pipeline-plugin"              # Build Pipeline Visualization
    "pipeline-stage-view"                # Stage View for Pipelines
    "pipeline-graph-view"                # Visual Pipeline Graphs
    "metrics"                            # Application Metrics
    "monitoring"                         # System Monitoring
    "embeddable-build-status"            # Embed Build Status Badges
    "groovy-postbuild"                   # Enhanced Post-build Actions
    "github-branch-source"               # Better GitHub Integration
    "workflow-aggregator"                # Pipeline Suite
    "credentials-binding"                # Secure Credentials Display
    "badge"                              # Build Badges
    "build-user-vars-plugin"             # User Build Variables
    "timestamper"                        # Timestamps in Console
    "ansicolor"                          # Color in Console Output
    "slack"                              # Slack Notifications Widget
)

# Install each plugin
for plugin in "${plugins[@]}"; do
    echo "Installing $plugin..."
    java -jar $JENKINS_CLI -s $JENKINS_URL -auth admin:admin install-plugin $plugin
done

echo "✅ Plugins installed! Restart Jenkins to activate:"
echo "sudo systemctl restart jenkins"

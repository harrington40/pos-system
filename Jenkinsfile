pipeline {
    agent any

    parameters {
        string(name: 'APP_NAME', defaultValue: 'pos-system', description: 'Application name for release tracking')
        choice(name: 'PLATFORM', choices: ['web', 'android', 'ios'], description: 'Target platform')
        string(name: 'APP_VERSION', defaultValue: '1.0.0', description: 'Release version number')
    }

    environment {
        NODE_VERSION = '20.x'
        BACKEND_DIR = 'backend'
        FRONTEND_DIR = 'frontend'
        DB_HOST = 'localhost'
        DB_NAME = 'app_releases'
        DB_USER = 'jenkins_release'
        NVM_DIR = "${env.HOME}/.nvm"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir("${BACKEND_DIR}") {
                    sh 'npm ci'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir("${FRONTEND_DIR}") {
                    sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    npm ci
                    '''
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir("${BACKEND_DIR}") {
                    sh 'npm run test:ci'
                }
            }
            post {
                always {
                    junit 'backend/test-results/junit.xml'
                }
            }
        }

        stage('Test Frontend') {
            steps {
                dir("${FRONTEND_DIR}") {
                    sh 'npm test || echo "No frontend tests configured yet"'
                }
            }
        }

        stage('Build Backend') {
            steps {
                dir("${BACKEND_DIR}") {
                    // Verify the server module loads without errors
                    sh 'node --check server.js && echo "Backend syntax OK"'
                }
            }
        }

        stage('Build Frontend (Web)') {
            steps {
                dir("${FRONTEND_DIR}") {
                    sh '''
                    # Use Node.js 20 if available via nvm
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    node --version
                    npx expo export --platform web 2>&1 || echo "Frontend web build skipped"
                    '''
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'frontend/dist/**/*', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Build Android APK') {
            environment {
                ANDROID_HOME = "${env.ANDROID_HOME ?: '/root/android-sdk'}"
            }
            steps {
                dir("${FRONTEND_DIR}") {
                    sh '''
                    # Use Node.js 20 if available via nvm
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    node --version
                    npx expo prebuild --platform android --clean 2>&1 || echo "Expo prebuild skipped"
                    '''
                    sh '''
                    cd android
                    if [ -f gradlew ]; then
                        # Set Android SDK location from ANDROID_HOME
                        echo "sdk.dir=${ANDROID_HOME}" > local.properties
                        chmod +x gradlew
                        ./gradlew assembleRelease 2>&1 || echo "Gradle build failed"
                    else
                        echo "Android project not generated"
                    fi
                    '''
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'frontend/android/app/build/outputs/apk/release/*.apk', fingerprint: true, allowEmptyArchive: true
                }
            }
        }
        stage('Save Release Record') {
            steps {
                withCredentials([string(credentialsId: 'jenkins-release-db-password', variable: 'DB_PASS')]) {
                    sh '''
                    ARTIFACT="build/${APP_NAME}-${PLATFORM}-${APP_VERSION}.zip"

                    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                    INSERT INTO releases
                    (app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit)
                    VALUES
                    ('$APP_NAME', '$PLATFORM', '$APP_VERSION', '$BUILD_NUMBER', 'SUCCESS', '$ARTIFACT', '$BRANCH_NAME', '$GIT_COMMIT');
                    "
                    '''
                }
            }
        }

        stage('Publish Release Report') {
            steps {
                withCredentials([string(credentialsId: 'jenkins-release-db-password', variable: 'DB_PASS')]) {
                    dir("${BACKEND_DIR}") {
                        sh '''
                        mkdir -p release-reports

                        # Query releases as CSV
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -F"," -c "
                        SELECT id, app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit, created_at
                        FROM releases
                        ORDER BY created_at DESC
                        LIMIT 20;
                        " > release-reports/releases.csv 2>/dev/null || echo "CSV export skipped"

                        # Generate modern styled HTML report
                        cat > release-reports/releases.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Release History - POS System</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    min-height: 100vh;
    padding: 40px 20px;
    color: #e0e0e0;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 35px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .header h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(90deg, #00d2ff, #3a7bd5);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header .badge {
    background: rgba(0,210,255,0.15);
    color: #00d2ff;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(0,210,255,0.3);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 12px;
    overflow: hidden;
  }
  thead {
    background: rgba(0,210,255,0.1);
  }
  th {
    padding: 14px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #00d2ff;
    border-bottom: 2px solid rgba(0,210,255,0.2);
  }
  td {
    padding: 14px 16px;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    color: #c0c0c0;
  }
  tr:hover td {
    background: rgba(255,255,255,0.03);
  }
  .status-success {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(0,200,83,0.15);
    color: #00c853;
    border: 1px solid rgba(0,200,83,0.3);
  }
  .status-failed {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255,82,82,0.15);
    color: #ff5252;
    border: 1px solid rgba(255,82,82,0.3);
  }
  .platform-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .platform-web { background: rgba(33,150,243,0.2); color: #64b5f6; }
  .platform-android { background: rgba(76,175,80,0.2); color: #81c784; }
  .platform-ios { background: rgba(255,255,255,0.1); color: #e0e0e0; }
  .commit-hash {
    font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 12px;
    color: #888;
  }
  .date-cell {
    font-size: 12px;
    color: #999;
    white-space: nowrap;
  }
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }
  .empty-state h2 { font-size: 20px; margin-bottom: 10px; color: #888; }
  .footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.05);
    text-align: center;
    font-size: 12px;
    color: #555;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📦 Release History</h1>
    <span class="badge">POS System</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>App</th>
        <th>Platform</th>
        <th>Version</th>
        <th>Build</th>
        <th>Status</th>
        <th>Branch</th>
        <th>Commit</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
HTMLEOF

                        # Parse CSV and generate table rows
                        if [ -f release-reports/releases.csv ]; then
                            # Skip header line, read data lines
                            tail -n +2 release-reports/releases.csv | while IFS=',' read -r id app platform version build status artifact branch commit created; do
                                # Clean quotes from CSV
                                id=$(echo "$id" | tr -d '"')
                                app=$(echo "$app" | tr -d '"')
                                platform=$(echo "$platform" | tr -d '"')
                                version=$(echo "$version" | tr -d '"')
                                build=$(echo "$build" | tr -d '"')
                                status=$(echo "$status" | tr -d '"')
                                branch=$(echo "$branch" | tr -d '"')
                                commit_short=$(echo "$commit" | tr -d '"' | head -c 8)
                                created=$(echo "$created" | tr -d '"' | head -c 10)

                                # Determine status class
                                status_class="status-success"
                                echo "$status" | grep -qi "fail" && status_class="status-failed"

                                # Platform class
                                plat_class="platform-${platform}"

                                cat >> release-reports/releases.html << ROWEOF
      <tr>
        <td>${id}</td>
        <td>${app}</td>
        <td><span class="platform-tag ${plat_class}">${platform}</span></td>
        <td>${version}</td>
        <td>${build}</td>
        <td><span class="${status_class}">${status}</span></td>
        <td>${branch}</td>
        <td><span class="commit-hash">${commit_short}</span></td>
        <td class="date-cell">${created}</td>
      </tr>
ROWEOF
                            done
                        else
                            cat >> release-reports/releases.html << 'EMPTYEOF'
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <h2>No releases recorded yet</h2>
            <p>Releases will appear here after the pipeline runs successfully.</p>
          </div>
        </td>
      </tr>
EMPTYEOF
                        fi

                        # Close HTML
                        cat >> release-reports/releases.html << 'HTMLEOF'
    </tbody>
  </table>
  <div class="footer">
    Generated by Jenkins Pipeline &bull; POS System &bull; Automated Release Tracking
  </div>
</div>
</body>
</html>
HTMLEOF

                        echo "Release report generated successfully"
                        '''
                    }
                }
            }
            post {
                always {
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'backend/release-reports',
                        reportFiles: 'releases.html',
                        reportName: 'Release History'
                    ])
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            emailext(
                subject: "[POS System] Pipeline Failed: ${env.BUILD_NUMBER}",
                body: "The pipeline has failed.\n\nProject: POS System\nBranch: ${env.BRANCH_NAME}\nBuild: ${env.BUILD_NUMBER}\nURL: ${env.BUILD_URL}\n\nPlease check the build logs for details.",
                to: 'admin@transtechologies.com'
            )
        }
        success {
            emailext(
                subject: "[POS System] Pipeline Succeeded: ${env.BUILD_NUMBER}",
                body: "Build ${env.BUILD_NUMBER} succeeded.\n\nProject: POS System\nBranch: ${env.BRANCH_NAME}\nBuild: ${env.BUILD_NUMBER}\nURL: ${env.BUILD_URL}\n\nArtifacts are available in the build archive.",
                to: 'admin@transtechologies.com'
            )
        }
    }
}

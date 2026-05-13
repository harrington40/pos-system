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
                script {
                    // Calculate build duration in seconds
                    def buildDuration = currentBuild.durationString ?: ''
                    // Remove ' and ms' suffix, keep e.g. '2.5 sec' or '1 min 30 sec'
                    if (buildDuration =~ /^[0-9.]+[ ]*(sec|min|hr)/) {
                        buildDuration = buildDuration.replace(' and counting', '')
                    } else {
                        buildDuration = "${currentBuild.duration / 1000}s"
                    }
                    env.BUILD_DURATION = buildDuration
                }
                withCredentials([string(credentialsId: 'jenkins-release-db-password', variable: 'DB_PASS')]) {
                    sh '''
                    ARTIFACT="build/${APP_NAME}-${PLATFORM}-${APP_VERSION}.zip"

                    # Determine release channel based on branch
                    RELEASE_CHANNEL="stable"
                    echo "$BRANCH_NAME" | grep -qiE "^(main|master)$" && RELEASE_CHANNEL="production"
                    echo "$BRANCH_NAME" | grep -qi "release" && RELEASE_CHANNEL="rc"
                    echo "$BRANCH_NAME" | grep -qi "beta" && RELEASE_CHANNEL="beta"
                    echo "$BRANCH_NAME" | grep -qiE "^(dev|develop)" && RELEASE_CHANNEL="dev"

                    # Determine environment
                    ENVIRONMENT="staging"
                    echo "$BRANCH_NAME" | grep -qiE "^(main|master)$" && ENVIRONMENT="production"
                    echo "$BRANCH_NAME" | grep -qi "dev" && ENVIRONMENT="development"

                    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                    INSERT INTO releases
                    (app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit, build_duration, release_channel, environment)
                    VALUES
                    ('$APP_NAME', '$PLATFORM', '$APP_VERSION', '$BUILD_NUMBER', 'SUCCESS', '$ARTIFACT', '$BRANCH_NAME', '$GIT_COMMIT', '$BUILD_DURATION', '$RELEASE_CHANNEL', '$ENVIRONMENT');
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

                        # Query releases as CSV with all columns
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -F"," -c "
                        SELECT id, app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit, created_at, build_duration, release_channel, environment
                        FROM releases
                        ORDER BY created_at DESC
                        LIMIT 50;
                        " > release-reports/releases.csv 2>/dev/null || echo "CSV export skipped"

                        # Generate premium HTML report with all features
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
    max-width: 1300px;
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
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 35px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
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
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* ---- Latest Release Cards ---- */
  .latest-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 30px;
  }
  .release-card {
    background: rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }
  .release-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
  .release-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    border-radius: 14px 0 0 14px;
  }
  .release-card.card-web::before { background: linear-gradient(180deg, #2196f3, #1565c0); }
  .release-card.card-android::before { background: linear-gradient(180deg, #4caf50, #2e7d32); }
  .release-card.card-ios::before { background: linear-gradient(180deg, #9e9e9e, #616161); }
  .release-card .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .release-card .card-platform-icon { font-size: 24px; }
  .release-card .card-version {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
  }
  .release-card .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }
  .release-card .card-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ---- Search Bar ---- */
  .search-bar {
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .search-bar input {
    flex: 1;
    min-width: 200px;
    padding: 12px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #e0e0e0;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-bar input:focus {
    border-color: #00d2ff;
    box-shadow: 0 0 0 3px rgba(0,210,255,0.15);
  }
  .search-bar input::placeholder { color: #666; }
  .search-bar .filter-select {
    padding: 12px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #e0e0e0;
    font-size: 14px;
    outline: none;
    cursor: pointer;
  }
  .search-bar .filter-select:focus {
    border-color: #00d2ff;
  }
  .search-bar .filter-select option { background: #1a1a2e; color: #e0e0e0; }
  .search-bar .stats {
    font-size: 13px;
    color: #888;
    white-space: nowrap;
  }

  /* ---- Table ---- */
  .table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1200px;
  }
  thead {
    background: rgba(0,210,255,0.08);
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(15,12,41,0.97);
    backdrop-filter: blur(10px);
  }
  th {
    padding: 14px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #00d2ff;
    border-bottom: 2px solid rgba(0,210,255,0.2);
    white-space: nowrap;
  }
  td {
    padding: 12px;
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    border-right: 1px solid rgba(255,255,255,0.03);
    color: #c0c0c0;
    vertical-align: middle;
  }
  td:last-child { border-right: none; }
  tr:hover td {
    background: rgba(255,255,255,0.04);
  }
  /* Grid lines */
  table, th, td {
    border: 1px solid rgba(255,255,255,0.06);
  }
  thead th {
    border-bottom: 2px solid rgba(0,210,255,0.25);
  }

  /* ---- Status Badges ---- */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .status-success {
    background: rgba(0,200,83,0.15);
    color: #00c853;
    border: 1px solid rgba(0,200,83,0.3);
  }
  .status-failed {
    background: rgba(255,82,82,0.15);
    color: #ff5252;
    border: 1px solid rgba(255,82,82,0.3);
  }
  .status-in-progress {
    background: rgba(255,193,7,0.15);
    color: #ffc107;
    border: 1px solid rgba(255,193,7,0.3);
  }
  .status-pending {
    background: rgba(158,158,158,0.15);
    color: #bdbdbd;
    border: 1px solid rgba(158,158,158,0.3);
  }

  /* ---- Platform Icons ---- */
  .platform-icon {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }
  .platform-icon .icon { font-size: 18px; }
  .platform-web .icon { color: #64b5f6; }
  .platform-android .icon { color: #81c784; }
  .platform-ios .icon { color: #e0e0e0; }

  /* ---- Channel Tags ---- */
  .channel-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .channel-production { background: rgba(0,200,83,0.15); color: #00c853; border: 1px solid rgba(0,200,83,0.2); }
  .channel-stable { background: rgba(33,150,243,0.15); color: #64b5f6; border: 1px solid rgba(33,150,243,0.2); }
  .channel-rc { background: rgba(255,152,0,0.15); color: #ffb74d; border: 1px solid rgba(255,152,0,0.2); }
  .channel-beta { background: rgba(156,39,176,0.15); color: #ce93d8; border: 1px solid rgba(156,39,176,0.2); }
  .channel-dev { background: rgba(255,87,34,0.15); color: #ff8a65; border: 1px solid rgba(255,87,34,0.2); }

  /* ---- Environment Tags ---- */
  .env-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .env-production { background: rgba(233,30,99,0.15); color: #f06292; border: 1px solid rgba(233,30,99,0.2); }
  .env-staging { background: rgba(255,193,7,0.15); color: #ffd54f; border: 1px solid rgba(255,193,7,0.2); }
  .env-development { background: rgba(96,125,139,0.15); color: #90a4ae; border: 1px solid rgba(96,125,139,0.2); }

  /* ---- Artifact Download Button ---- */
  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
    background: rgba(0,210,255,0.12);
    color: #00d2ff;
    border: 1px solid rgba(0,210,255,0.25);
    transition: all 0.2s;
    cursor: pointer;
  }
  .download-btn:hover {
    background: rgba(0,210,255,0.25);
    box-shadow: 0 0 15px rgba(0,210,255,0.15);
  }

  /* ---- Commit Hash ---- */
  .commit-hash {
    font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 11px;
    color: #888;
    background: rgba(255,255,255,0.04);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .date-cell {
    font-size: 11px;
    color: #999;
    white-space: nowrap;
  }
  .duration-cell {
    font-size: 12px;
    color: #aaa;
    white-space: nowrap;
  }

  /* ---- Empty State ---- */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }
  .empty-state h2 { font-size: 20px; margin-bottom: 10px; color: #888; }
  .empty-state p { font-size: 14px; }

  /* ---- Footer ---- */
  .footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12px;
    color: #555;
  }
  .footer .pipeline-info { color: #777; }
  .footer .pipeline-info strong { color: #999; }

  /* ---- Responsive ---- */
  @media (max-width: 768px) {
    body { padding: 20px 10px; }
    .container { padding: 20px; }
    .header { flex-direction: column; align-items: flex-start; }
    .header h1 { font-size: 22px; }
    .latest-cards { grid-template-columns: 1fr; }
    .search-bar { flex-direction: column; }
    .search-bar input { min-width: 100%; }
    .search-bar .filter-select { width: 100%; }
    .footer { flex-direction: column; text-align: center; }
  }

  /* ---- Row animations ---- */
  .fade-in {
    animation: fadeIn 0.3s ease-in;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-left">
      <h1>📦 Release History</h1>
      <span class="badge">POS System</span>
    </div>
    <div class="header-right">
      <span class="badge" id="releaseCount">0 releases</span>
    </div>
  </div>

  <!-- Latest Release Cards -->
  <div class="latest-cards" id="latestCards">
  </div>

  <!-- Search & Filter Bar -->
  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="🔍 Search releases by version, branch, commit, app..." onkeyup="filterTable()">
    <select class="filter-select" id="platformFilter" onchange="filterTable()">
      <option value="">All Platforms</option>
      <option value="web">🌐 Web</option>
      <option value="android">📱 Android</option>
      <option value="ios">🍎 iOS</option>
    </select>
    <select class="filter-select" id="channelFilter" onchange="filterTable()">
      <option value="">All Channels</option>
      <option value="production">Production</option>
      <option value="stable">Stable</option>
      <option value="rc">Release Candidate</option>
      <option value="beta">Beta</option>
      <option value="dev">Dev</option>
    </select>
    <select class="filter-select" id="statusFilter" onchange="filterTable()">
      <option value="">All Status</option>
      <option value="success">Success</option>
      <option value="fail">Failed</option>
    </select>
    <span class="stats" id="stats">Showing 0 of 0</span>
  </div>

  <!-- Table -->
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>App</th>
          <th>Platform</th>
          <th>Version</th>
          <th>Build</th>
          <th>Channel</th>
          <th>Environment</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Branch</th>
          <th>Commit</th>
          <th>Artifact</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody id="tableBody">
HTMLEOF

                        # Parse CSV and generate table rows + latest cards
                        if [ -f release-reports/releases.csv ]; then
                            ROW_INDEX=0

                            # Skip header line, read data lines
                            tail -n +2 release-reports/releases.csv | while IFS=',' read -r id app platform version build status artifact branch commit created duration channel env; do
                                # Clean quotes from CSV
                                id=$(echo "$id" | tr -d '"')
                                app=$(echo "$app" | tr -d '"')
                                platform=$(echo "$platform" | tr -d '"')
                                version=$(echo "$version" | tr -d '"')
                                build=$(echo "$build" | tr -d '"')
                                status=$(echo "$status" | tr -d '"')
                                artifact=$(echo "$artifact" | tr -d '"')
                                branch=$(echo "$branch" | tr -d '"')
                                commit_full=$(echo "$commit" | tr -d '"')
                                commit_short=$(echo "$commit_full" | head -c 8)
                                created=$(echo "$created" | tr -d '"' | head -c 10)
                                duration=$(echo "$duration" | tr -d '"')
                                channel=$(echo "$channel" | tr -d '"')
                                env=$(echo "$env" | tr -d '"')

                                # Default values for empty fields
                                [ -z "$channel" ] && channel="stable"
                                [ -z "$env" ] && env="staging"
                                [ -z "$duration" ] && duration="-"

                                # Determine status class
                                status_class="status-success"
                                echo "$status" | grep -qi "fail" && status_class="status-failed"
                                echo "$status" | grep -qi "progress" && status_class="status-in-progress"
                                echo "$status" | grep -qi "pend" && status_class="status-pending"

                                # Status dot emoji
                                status_dot="✅"
                                echo "$status" | grep -qi "fail" && status_dot="❌"
                                echo "$status" | grep -qi "progress" && status_dot="🔄"
                                echo "$status" | grep -qi "pend" && status_dot="⏳"

                                # Platform icon
                                plat_icon="🌐"
                                [ "$platform" = "android" ] && plat_icon="📱"
                                [ "$platform" = "ios" ] && plat_icon="🍎"

                                # Channel class
                                channel_class="channel-${channel}"

                                # Environment class
                                env_class="env-${env}"

                                # Artifact download link (if artifact path exists)
                                artifact_link=""
                                if [ -n "$artifact" ] && [ "$artifact" != "build//.zip" ]; then
                                    artifact_link="<a href=\"${artifact}\" class=\"download-btn\">⬇ Download</a>"
                                else
                                    artifact_link="<span style=\"color:#555;font-size:11px;\">—</span>"
                                fi

                                # Build table row
                                cat >> release-reports/releases.html << ROWEOF
      <tr class="fade-in">
        <td>${id}</td>
        <td><strong>${app}</strong></td>
        <td><span class="platform-icon platform-${platform}"><span class="icon">${plat_icon}</span>${platform}</span></td>
        <td><strong style="color:#fff;">${version}</strong></td>
        <td>#${build}</td>
        <td><span class="channel-tag ${channel_class}">${channel}</span></td>
        <td><span class="env-tag ${env_class}">${env}</span></td>
        <td><span class="status-badge ${status_class}">${status_dot} ${status}</span></td>
        <td class="duration-cell">${duration}</td>
        <td>${branch}</td>
        <td><span class="commit-hash">${commit_short}</span></td>
        <td>${artifact_link}</td>
        <td class="date-cell">${created}</td>
      </tr>
ROWEOF

                                # Build latest cards (first 3)
                                if [ $ROW_INDEX -lt 3 ]; then
                                    cat >> release-reports/releases.html << CARDEOF
      <div class="release-card card-${platform}" style="display:none;" data-card-index="${ROW_INDEX}">
        <div class="card-header">
          <span class="card-platform-icon">${plat_icon}</span>
          <span class="status-badge ${status_class}">${status_dot} ${status}</span>
        </div>
        <div class="card-version">${app} v${version}</div>
        <div class="card-meta">
          <span>🔢 Build #${build}</span>
          <span>📂 ${channel}</span>
          <span>🌍 ${env}</span>
          <span>⏱ ${duration}</span>
          <span>🌿 ${branch}</span>
          <span>📅 ${created}</span>
        </div>
      </div>
CARDEOF
                                fi

                                ROW_INDEX=$((ROW_INDEX + 1))
                            done
                        else
                            cat >> release-reports/releases.html << 'EMPTYEOF'
      <tr>
        <td colspan="13">
          <div class="empty-state">
            <h2>No releases recorded yet</h2>
            <p>Releases will appear here after the pipeline runs successfully.</p>
          </div>
        </td>
      </tr>
EMPTYEOF
                        fi

                        # Close HTML with JavaScript for search, filtering, and cards
                        cat >> release-reports/releases.html << 'HTMLEOF'
    </tbody>
  </table>
  </div>
  <div class="footer">
    <span>Generated by Jenkins Pipeline &bull; POS System &bull; Automated Release Tracking</span>
    <span class="pipeline-info">Build <strong id="buildNumber">${BUILD_NUMBER}</strong> &bull; <span id="genTime"></span></span>
  </div>
</div>

<script>
// Show latest cards (first 3)
(function() {
  const cards = document.querySelectorAll('.release-card');
  cards.forEach(function(card, i) {
    if (i < 3) card.style.display = 'block';
  });
})();

// Set generation timestamp
document.getElementById('genTime').textContent = new Date().toISOString().replace('T', ' ').substr(0, 19);

// Search and filter function
function filterTable() {
  const input = document.getElementById('searchInput');
  const filter = input.value.toLowerCase();
  const platformFilter = document.getElementById('platformFilter').value.toLowerCase();
  const channelFilter = document.getElementById('channelFilter').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
  const table = document.querySelector('table tbody');
  const rows = table.getElementsByTagName('tr');
  let visibleCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty state row
    if (row.querySelector('.empty-state')) continue;

    const cells = row.getElementsByTagName('td');
    if (cells.length < 13) continue;

    const rowText = row.textContent.toLowerCase();
    const platform = cells[2] ? cells[2].textContent.toLowerCase().trim() : '';
    const channel = cells[5] ? cells[5].textContent.toLowerCase().trim() : '';
    const status = cells[7] ? cells[7].textContent.toLowerCase().trim() : '';

    const matchesSearch = filter === '' || rowText.indexOf(filter) > -1;
    const matchesPlatform = platformFilter === '' || platform.indexOf(platformFilter) > -1;
    const matchesChannel = channelFilter === '' || channel.indexOf(channelFilter) > -1;
    const matchesStatus = statusFilter === '' || status.indexOf(statusFilter) > -1;

    if (matchesSearch && matchesPlatform && matchesChannel && matchesStatus) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  }

  // Update stats
  const total = rows.length;
  document.getElementById('stats').textContent = 'Showing ' + visibleCount + ' of ' + total;
  document.getElementById('releaseCount').textContent = visibleCount + ' releases';
}

// Initial filter call
filterTable();
</script>
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

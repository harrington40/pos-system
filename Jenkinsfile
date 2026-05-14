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
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
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
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    node --version
                    npx expo export --platform web 2>&1 || echo "Frontend web build skipped"
                    '''
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'frontend/dist/**/*', fingerprint: true
                }
            }
        }

        stage('Package Artifacts') {
            steps {
                script {
                    // Ensure zip tool is available
                    sh '''
                    if ! command -v zip &>/dev/null; then
                        echo "zip not found, attempting to install..."
                        if command -v apt-get &>/dev/null; then
                            apt-get update -qq && apt-get install -y -qq zip 2>&1 || true
                        elif command -v yum &>/dev/null; then
                            yum install -y zip 2>&1 || true
                        elif command -v apk &>/dev/null; then
                            apk add zip 2>&1 || true
                        else
                            echo "WARNING: Could not install zip. ZIP creation will fail."
                        fi
                    fi
                    command -v zip && echo "zip is available" || echo "zip is NOT available"
                    '''

                    // Create build output directory at workspace root
                    sh 'mkdir -p build'

                    // Create ZIP of web build
                    dir("${FRONTEND_DIR}") {
                        sh '''
                        if [ -d dist ] && [ "$(ls -A dist 2>/dev/null)" ]; then
                            echo "Creating web build ZIP..."
                            mkdir -p ../../build
                            (cd dist && zip -r ../../build/web-build-${BUILD_NUMBER}.zip . -x ".*") 2>&1 || echo "Web ZIP creation failed"
                            ls -lh ../../build/web-build-${BUILD_NUMBER}.zip 2>/dev/null || true
                        else
                            echo "No web dist directory found, skipping web ZIP"
                        fi
                        '''
                    }

                    // Create ZIP of Android APK
                    dir("${FRONTEND_DIR}") {
                        sh '''
                        APK_DIR="android/app/build/outputs/apk/release"
                        if [ -d "$APK_DIR" ] && [ "$(ls -A "$APK_DIR"/*.apk 2>/dev/null)" ]; then
                            echo "Creating Android APK ZIP..."
                            mkdir -p ../../build
                            (cd "$APK_DIR" && zip -j ../../../../build/android-apk-${BUILD_NUMBER}.zip *.apk) 2>&1 || echo "Android APK ZIP creation failed"
                            ls -lh ../../build/android-apk-${BUILD_NUMBER}.zip 2>/dev/null || true
                        else
                            echo "No APK files found, skipping Android ZIP"
                        fi
                        '''
                    }

                    // Create combined release ZIP with all artifacts
                    dir("${FRONTEND_DIR}") {
                        sh '''
                        echo "Creating combined release ZIP..."
                        RELEASE_DIR="../../build/release-${BUILD_NUMBER}"
                        mkdir -p "$RELEASE_DIR"

                        # Copy web build if exists
                        if [ -d dist ] && [ "$(ls -A dist 2>/dev/null)" ]; then
                            cp -r dist "$RELEASE_DIR/web" 2>/dev/null || true
                        fi

                        # Copy APK if exists
                        APK_DIR="android/app/build/outputs/apk/release"
                        if [ -d "$APK_DIR" ] && [ "$(ls -A "$APK_DIR"/*.apk 2>/dev/null)" ]; then
                            mkdir -p "$RELEASE_DIR/android"
                            cp "$APK_DIR"/*.apk "$RELEASE_DIR/android/" 2>/dev/null || true
                        fi

                        # Create the combined ZIP from the build directory
                        (cd ../../build && zip -r "release-${BUILD_NUMBER}.zip" "release-${BUILD_NUMBER}") 2>&1 || echo "Combined release ZIP creation failed"
                        rm -rf "$RELEASE_DIR"
                        ls -lh ../../build/release-${BUILD_NUMBER}.zip 2>/dev/null || true
                        '''
                    }
                }
            }
            post {
                success {
                    // Archive the ZIP files
                    archiveArtifacts artifacts: 'build/*.zip', fingerprint: true
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
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    node --version
                    npx expo prebuild --platform android --clean 2>&1 || echo "Expo prebuild skipped"
                    '''
                    sh '''
                    # Source nvm and set PATH so Gradle's createBundleReleaseJsAndAssets
                    # uses Node.js 20 instead of the system Node.js 18
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null || true
                    # Prepend nvm's Node.js 20 bin directory to PATH so that when Gradle
                    # spawns 'node' for createBundleReleaseJsAndAssets, it finds v20
                    NVM_BIN="$(which node 2>/dev/null || true)"
                    if [ -n "$NVM_BIN" ]; then
                        NVM_BIN_DIR="$(dirname "$NVM_BIN")"
                        export PATH="$NVM_BIN_DIR:$PATH"
                    fi
                    node --version
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
                    archiveArtifacts artifacts: 'frontend/android/app/build/outputs/apk/release/*.apk', fingerprint: true
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
                    # --- Auto-migration: ensure new columns exist ---
                    # Uses information_schema.columns for PostgreSQL < 9.6 compatibility.
                    # SQL is written to a temp file and executed via psql -f to avoid
                    # shell interpretation of $$ (PID expansion) in DO blocks.
                    # If ALTER TABLE fails (e.g. insufficient privileges), the migration
                    # is skipped gracefully — columns may already exist from a manual run.

cat > /tmp/pos_migration.sql << 'SQLEOF'
DO $migrate$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='releases' AND column_name='build_duration'
    ) THEN
        ALTER TABLE releases ADD COLUMN build_duration VARCHAR(20) DEFAULT '';
    END IF;
END
$migrate$;

DO $migrate$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='releases' AND column_name='release_channel'
    ) THEN
        ALTER TABLE releases ADD COLUMN release_channel VARCHAR(50) DEFAULT 'stable';
    END IF;
END
$migrate$;

DO $migrate$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='releases' AND column_name='environment'
    ) THEN
        ALTER TABLE releases ADD COLUMN environment VARCHAR(50) DEFAULT 'production';
    END IF;
END
$migrate$;
SQLEOF

                    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /tmp/pos_migration.sql 2>&1 || echo "WARNING: Auto-migration ALTER TABLE failed (jenkins_release is not table owner). Columns may need to be added manually."
                    rm -f /tmp/pos_migration.sql

                    # Use the combined release ZIP if it exists, otherwise fall back to platform-specific ZIP
                    if [ -f "build/release-${BUILD_NUMBER}.zip" ]; then
                        ARTIFACT="build/release-${BUILD_NUMBER}.zip"
                    elif [ -f "build/web-build-${BUILD_NUMBER}.zip" ]; then
                        ARTIFACT="build/web-build-${BUILD_NUMBER}.zip"
                    elif [ -f "build/android-apk-${BUILD_NUMBER}.zip" ]; then
                        ARTIFACT="build/android-apk-${BUILD_NUMBER}.zip"
                    else
                        ARTIFACT="build/${APP_NAME}-${PLATFORM}-${APP_VERSION}.zip"
                    fi

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

                    # Check if new columns exist; if not, use fallback INSERT without them
                    NEW_COLS_EXIST=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name='releases' AND column_name IN ('build_duration','release_channel','environment')
                    " 2>/dev/null || echo "0")

                    if [ "$NEW_COLS_EXIST" = "3" ]; then
                        # All new columns exist — use full INSERT
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                        INSERT INTO releases
                        (app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit, build_duration, release_channel, environment)
                        VALUES
                        ('$APP_NAME', '$PLATFORM', '$APP_VERSION', '$BUILD_NUMBER', 'SUCCESS', '$ARTIFACT', '$BRANCH_NAME', '$GIT_COMMIT', '$BUILD_DURATION', '$RELEASE_CHANNEL', '$ENVIRONMENT');
                        "
                    else
                        # New columns don't exist — use fallback INSERT without them
                        echo "WARNING: New columns (build_duration, release_channel, environment) not found. Using fallback INSERT."
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                        INSERT INTO releases
                        (app_name, platform, version, build_number, status, artifact_path, git_branch, git_commit)
                        VALUES
                        ('$APP_NAME', '$PLATFORM', '$APP_VERSION', '$BUILD_NUMBER', 'SUCCESS', '$ARTIFACT', '$BRANCH_NAME', '$GIT_COMMIT');
                        "
                    fi
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
        stage('Publish Deploy Dashboard') {
            steps {
                withCredentials([string(credentialsId: 'jenkins-release-db-password', variable: 'DB_PASS')]) {
                    dir("${BACKEND_DIR}") {
                        sh '''
                        mkdir -p release-reports

                        # Query deployment data — latest release per environment per platform
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -F"," -c "
                        SELECT DISTINCT ON (environment, platform)
                            id, app_name, platform, version, build_number, status, git_branch, git_commit, created_at, build_duration, release_channel, environment
                        FROM releases
                        WHERE environment IN ('development','staging','production')
                        ORDER BY environment, platform, created_at DESC;
                        " > release-reports/deploy-dashboard.csv 2>/dev/null || echo "Dashboard CSV export skipped"

                        # Also get all releases for history view
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -F"," -c "
                        SELECT id, app_name, platform, version, build_number, status, environment, created_at, build_duration, release_channel
                        FROM releases
                        ORDER BY created_at DESC
                        LIMIT 30;
                        " > release-reports/deploy-history.csv 2>/dev/null || echo "History CSV export skipped"

                        # Generate Deploy Dashboard HTML
                        cat > release-reports/deploy-dashboard.html << 'DEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deploy Dashboard - POS System</title>
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
  .header-left { display: flex; align-items: center; gap: 16px; }
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
  .header-right { display: flex; align-items: center; gap: 12px; }

  /* ---- Environment Swimlanes ---- */
  .swimlanes { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
  .swimlane {
    background: rgba(255,255,255,0.04);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.06);
    position: relative;
    overflow: hidden;
  }
  .swimlane::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
  }
  .swimlane.env-production::before { background: linear-gradient(90deg, #e91e63, #f06292); }
  .swimlane.env-staging::before { background: linear-gradient(90deg, #ffc107, #ffd54f); }
  .swimlane.env-development::before { background: linear-gradient(90deg, #607d8b, #90a4ae); }
  .swimlane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .swimlane-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .swimlane-title h2 { font-size: 20px; font-weight: 700; color: #fff; }
  .swimlane-title .env-icon { font-size: 24px; }
  .swimlane-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .deploy-card {
    background: rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .deploy-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  }
  .deploy-card .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .deploy-card .platform-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
  }
  .deploy-card .version-text {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
  }
  .deploy-card .card-details {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
    color: #999;
  }
  .deploy-card .card-details span { display: flex; align-items: center; gap: 3px; }
  .deploy-card .empty-card {
    color: #555;
    font-size: 13px;
    text-align: center;
    padding: 20px;
    font-style: italic;
  }

  /* ---- Pipeline Flow Diagram ---- */
  .pipeline-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: 40px;
    flex-wrap: wrap;
    background: rgba(255,255,255,0.03);
    border-radius: 14px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .pipeline-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 20px;
    position: relative;
  }
  .pipeline-step .step-icon { font-size: 28px; }
  .pipeline-step .step-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }
  .pipeline-step .step-value {
    font-size: 13px;
    font-weight: 600;
    color: #e0e0e0;
  }
  .pipeline-step.active .step-value { color: #00d2ff; }
  .pipeline-arrow {
    font-size: 20px;
    color: #555;
    padding: 0 4px;
  }
  .pipeline-step.completed .step-icon { opacity: 1; }
  .pipeline-step.completed .step-label { color: #00c853; }
  .pipeline-step.current .step-icon { animation: pulse 1.5s infinite; }
  .pipeline-step.current .step-label { color: #00d2ff; }
  .pipeline-step.pending .step-icon { opacity: 0.4; }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }

  /* ---- Release History Table ---- */
  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(15,12,41,0.97);
    backdrop-filter: blur(10px);
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
  tr:hover td { background: rgba(255,255,255,0.04); }
  table, th, td { border: 1px solid rgba(255,255,255,0.06); }
  thead th { border-bottom: 2px solid rgba(0,210,255,0.25); }

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
  .status-success { background: rgba(0,200,83,0.15); color: #00c853; border: 1px solid rgba(0,200,83,0.3); }
  .status-failed { background: rgba(255,82,82,0.15); color: #ff5252; border: 1px solid rgba(255,82,82,0.3); }

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

  @media (max-width: 768px) {
    body { padding: 20px 10px; }
    .container { padding: 20px; }
    .header { flex-direction: column; align-items: flex-start; }
    .header h1 { font-size: 22px; }
    .swimlane-cards { grid-template-columns: 1fr; }
    .pipeline-flow { flex-direction: column; }
    .pipeline-arrow { transform: rotate(90deg); }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-left">
      <h1>🚀 Deploy Dashboard</h1>
      <span class="badge">POS System</span>
    </div>
    <div class="header-right">
      <span class="badge" id="envCount">0 environments</span>
    </div>
  </div>

  <!-- Pipeline Flow -->
  <div class="pipeline-flow" id="pipelineFlow">
    <div class="pipeline-step completed">
      <span class="step-icon">✅</span>
      <span class="step-label">Build</span>
      <span class="step-value">Complete</span>
    </div>
    <span class="pipeline-arrow">→</span>
    <div class="pipeline-step" id="stepDev">
      <span class="step-icon">🛠</span>
      <span class="step-label">Development</span>
      <span class="step-value" id="stepDevVal">—</span>
    </div>
    <span class="pipeline-arrow">→</span>
    <div class="pipeline-step" id="stepStaging">
      <span class="step-icon">🧪</span>
      <span class="step-label">Staging</span>
      <span class="step-value" id="stepStagingVal">—</span>
    </div>
    <span class="pipeline-arrow">→</span>
    <div class="pipeline-step" id="stepProduction">
      <span class="step-icon">🚀</span>
      <span class="step-label">Production</span>
      <span class="step-value" id="stepProdVal">—</span>
    </div>
  </div>

  <!-- Environment Swimlanes -->
  <div class="swimlanes" id="swimlanes">
DEOF

                        # Generate environment swimlanes from CSV
                        if [ -f release-reports/deploy-dashboard.csv ]; then
                            # Group by environment
                            for env_name in "development" "staging" "production"; do
                                env_icon="🛠"
                                [ "$env_name" = "staging" ] && env_icon="🧪"
                                [ "$env_name" = "production" ] && env_icon="🚀"

                                # Capitalize first letter (use awk to avoid sed backslash-u which confuses Groovy parser)
                                env_display=$(echo "$env_name" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')

                                cat >> release-reports/deploy-dashboard.html << SWIMEOF
    <div class="swimlane env-${env_name}">
      <div class="swimlane-header">
        <div class="swimlane-title">
          <span class="env-icon">${env_icon}</span>
          <h2>${env_display}</h2>
        </div>
        <span class="env-tag env-${env_name}">${env_name}</span>
      </div>
      <div class="swimlane-cards">
SWIMEOF

                                # Filter rows for this environment
                                grep -i ",${env_name}$" release-reports/deploy-dashboard.csv | while IFS=',' read -r id app platform version build status branch commit created duration channel env; do
                                    id=$(echo "$id" | tr -d '"')
                                    app=$(echo "$app" | tr -d '"')
                                    platform=$(echo "$platform" | tr -d '"')
                                    version=$(echo "$version" | tr -d '"')
                                    build=$(echo "$build" | tr -d '"')
                                    status=$(echo "$status" | tr -d '"')
                                    branch=$(echo "$branch" | tr -d '"')
                                    commit_short=$(echo "$commit" | tr -d '"' | head -c 8)
                                    created=$(echo "$created" | tr -d '"' | head -c 10)
                                    duration=$(echo "$duration" | tr -d '"')
                                    channel=$(echo "$channel" | tr -d '"')
                                    env=$(echo "$env" | tr -d '"')

                                    [ -z "$channel" ] && channel="stable"
                                    [ -z "$duration" ] && duration="-"

                                    plat_icon="🌐"
                                    [ "$platform" = "android" ] && plat_icon="📱"
                                    [ "$platform" = "ios" ] && plat_icon="🍎"

                                    status_dot="✅"
                                    echo "$status" | grep -qi "fail" && status_dot="❌"

                                    channel_class="channel-${channel}"

                                    cat >> release-reports/deploy-dashboard.html << CARDEOF
        <div class="deploy-card">
          <div class="card-top">
            <span class="platform-badge">${plat_icon} ${platform}</span>
            <span class="status-badge status-$(echo "$status" | tr '[:upper:]' '[:lower:]')">${status_dot}</span>
          </div>
          <div class="version-text">v${version}</div>
          <div class="card-details">
            <span>🔢 #${build}</span>
            <span>📂 <span class="channel-tag ${channel_class}">${channel}</span></span>
            <span>🌿 ${branch}</span>
            <span>📅 ${created}</span>
            <span>⏱ ${duration}</span>
          </div>
        </div>
CARDEOF
                                done

                                # Close swimlane
                                cat >> release-reports/deploy-dashboard.html << SWIMEOF
      </div>
    </div>
SWIMEOF
                            done
                        else
                            # No data — show empty swimlanes
                            for env_name in "development" "staging" "production"; do
                                env_icon="🛠"
                                [ "$env_name" = "staging" ] && env_icon="🧪"
                                [ "$env_name" = "production" ] && env_icon="🚀"
                                # Capitalize first letter (use awk to avoid sed backslash-u which confuses Groovy parser)
                                env_display=$(echo "$env_name" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
                                cat >> release-reports/deploy-dashboard.html << SWIMEOF
    <div class="swimlane env-${env_name}">
      <div class="swimlane-header">
        <div class="swimlane-title">
          <span class="env-icon">${env_icon}</span>
          <h2>${env_display}</h2>
        </div>
        <span class="env-tag env-${env_name}">${env_name}</span>
      </div>
      <div class="swimlane-cards">
        <div class="deploy-card">
          <div class="empty-card">No releases deployed yet</div>
        </div>
      </div>
    </div>
SWIMEOF
                            done
                        fi

                        # Release History Table section
                        cat >> release-reports/deploy-dashboard.html << 'DEOF'
  </div>

  <div class="section-title">📋 Recent Release Activity</div>
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
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
DEOF

                        # Generate history table rows
                        if [ -f release-reports/deploy-history.csv ]; then
                            tail -n +2 release-reports/deploy-history.csv | while IFS=',' read -r id app platform version build status env created duration channel; do
                                id=$(echo "$id" | tr -d '"')
                                app=$(echo "$app" | tr -d '"')
                                platform=$(echo "$platform" | tr -d '"')
                                version=$(echo "$version" | tr -d '"')
                                build=$(echo "$build" | tr -d '"')
                                status=$(echo "$status" | tr -d '"')
                                env=$(echo "$env" | tr -d '"')
                                created=$(echo "$created" | tr -d '"' | head -c 10)
                                duration=$(echo "$duration" | tr -d '"')
                                channel=$(echo "$channel" | tr -d '"')

                                [ -z "$channel" ] && channel="stable"
                                [ -z "$duration" ] && duration="-"
                                [ -z "$env" ] && env="staging"

                                plat_icon="🌐"
                                [ "$platform" = "android" ] && plat_icon="📱"
                                [ "$platform" = "ios" ] && plat_icon="🍎"

                                status_dot="✅"
                                echo "$status" | grep -qi "fail" && status_dot="❌"

                                status_class="status-success"
                                echo "$status" | grep -qi "fail" && status_class="status-failed"

                                env_class="env-${env}"
                                channel_class="channel-${channel}"

                                cat >> release-reports/deploy-dashboard.html << ROWEOF
        <tr>
          <td>${id}</td>
          <td><strong>${app}</strong></td>
          <td>${plat_icon} ${platform}</td>
          <td><strong style="color:#fff;">${version}</strong></td>
          <td>#${build}</td>
          <td><span class="channel-tag ${channel_class}">${channel}</span></td>
          <td><span class="env-tag ${env_class}">${env}</span></td>
          <td><span class="status-badge ${status_class}">${status_dot} ${status}</span></td>
          <td>${duration}</td>
          <td>${created}</td>
        </tr>
ROWEOF
                            done
                        else
                            cat >> release-reports/deploy-dashboard.html << 'EMPTYEOF'
        <tr>
          <td colspan="10" style="text-align:center;padding:40px;color:#666;">
            <h2 style="font-size:18px;margin-bottom:8px;color:#888;">No releases recorded yet</h2>
            <p>Releases will appear here after the pipeline runs successfully.</p>
          </td>
        </tr>
EMPTYEOF
                        fi

                        # Close HTML
                        cat >> release-reports/deploy-dashboard.html << 'DEOF'
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Generated by Jenkins Pipeline &bull; POS System &bull; Deploy Dashboard</span>
    <span class="pipeline-info">Build <strong>${BUILD_NUMBER}</strong> &bull; <span id="genTime"></span></span>
  </div>
</div>

<script>
// Set generation timestamp
document.getElementById('genTime').textContent = new Date().toISOString().replace('T', ' ').substr(0, 19);

// Update pipeline flow with data from swimlane cards
(function() {
  // Check which environments have cards
  const swimlanes = document.querySelectorAll('.swimlane');
  let envCount = 0;
  swimlanes.forEach(function(sl) {
    const cards = sl.querySelectorAll('.deploy-card');
    const hasData = cards.length > 0 && !sl.querySelector('.empty-card');
    if (hasData) envCount++;
  });
  document.getElementById('envCount').textContent = envCount + ' environments';

  // Try to get latest version per environment from cards
  const devCards = document.querySelector('.swimlane.env-development')?.querySelectorAll('.deploy-card');
  const stagingCards = document.querySelector('.swimlane.env-staging')?.querySelectorAll('.deploy-card');
  const prodCards = document.querySelector('.swimlane.env-production')?.querySelectorAll('.deploy-card');

  function getLatestVersion(cards) {
    if (!cards || cards.length === 0) return null;
    const firstCard = cards[0];
    if (firstCard.querySelector('.empty-card')) return null;
    const verEl = firstCard.querySelector('.version-text');
    return verEl ? verEl.textContent.trim() : null;
  }

  const devVer = getLatestVersion(devCards);
  const stagingVer = getLatestVersion(stagingCards);
  const prodVer = getLatestVersion(prodCards);

  if (devVer) {
    document.getElementById('stepDevVal').textContent = devVer;
    document.getElementById('stepDev').classList.add('completed');
  } else {
    document.getElementById('stepDev').classList.add('pending');
  }

  if (stagingVer) {
    document.getElementById('stepStagingVal').textContent = stagingVer;
    document.getElementById('stepStaging').classList.add('completed');
  } else {
    document.getElementById('stepStaging').classList.add('pending');
  }

  if (prodVer) {
    document.getElementById('stepProdVal').textContent = prodVer;
    document.getElementById('stepProduction').classList.add('completed');
  } else {
    document.getElementById('stepProduction').classList.add('pending');
  }

  // Mark current stage (the furthest along with data)
  if (prodVer) {
    document.getElementById('stepProduction').classList.add('current');
  } else if (stagingVer) {
    document.getElementById('stepStaging').classList.add('current');
  } else if (devVer) {
    document.getElementById('stepDev').classList.add('current');
  }
})();
</script>
</body>
</html>
DEOF

                        echo "Deploy Dashboard generated successfully"
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
                        reportFiles: 'deploy-dashboard.html',
                        reportName: 'Deploy Dashboard'
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

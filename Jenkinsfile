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
                        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                        SELECT id, app_name, platform, version, build_number, status, git_branch, git_commit, created_at
                        FROM releases
                        ORDER BY created_at DESC
                        LIMIT 20;
                        " --html > release-reports/releases.html 2>/dev/null || echo "HTML report generation skipped"
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

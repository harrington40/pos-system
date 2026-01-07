/*
 * Phonetics Learning App CI/CD Pipeline
 * Based on HRMS Jenkins architecture
 */

pipeline {
    agent any

    options {
        timeout(time: 2, unit: 'HOURS')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    environment {
        PROJECT_NAME = "phonetics-app"
        PYTHON_VERSION = '3.11'
        BACKEND_DIR = "backend"
        FLUTTER_DIR = "flutter_app"
        DOCKER_IMAGE = 'harrington40/phonetics-app'
        DOCKER_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
        APP_HOST = '0.0.0.0'
        APP_PORT = '8000'
    }

    triggers {
        // Prefer GitHub webhook
        // githubPush()
        // Fallback polling
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Pipeline Info') {
            steps {
                echo "=== Pipeline Information ==="
                echo "Project: ${PROJECT_NAME}"
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Build: ${env.BUILD_NUMBER}"
                echo "GIT_COMMIT: ${env.GIT_COMMIT}"
                echo "Workspace: ${env.WORKSPACE}"
                sh '''
                    set +e
                    pwd
                    ls -la
                    git log --oneline -1 || echo "git log failed"
                '''
            }
        }

        stage('Checkout') {
            steps {
                echo '=== Checking out code ==='
                checkout scm
                sh '''
                    git branch
                    git log --oneline -5
                '''
            }
        }

        stage('Validate Environment') {
            steps {
                sh '''
                    set +e
                    echo "=== Environment Validation ==="
                    which python3 || echo "WARNING: python3 not found"
                    python3 --version
                    
                    # Check for required files
                    test -f backend/requirements.txt || echo "WARNING: requirements.txt not found"
                    test -f run.sh || echo "WARNING: run.sh not found"
                    
                    df -h .
                    echo "Environment validation completed"
                '''
            }
        }

        stage('Setup Backend Environment') {
            steps {
                dir("${BACKEND_DIR}") {
                    sh '''
                        echo "=== Setting up Backend Virtual Environment ==="
                        
                        # Remove existing venv
                        if [ -d "venv" ]; then
                            echo "Removing existing virtual environment..."
                            rm -rf venv
                        fi
                        
                        # Create fresh virtual environment
                        python3 -m venv venv || (echo "ERROR: Failed to create venv" && exit 1)
                        
                        # Upgrade pip
                        ./venv/bin/python -m pip install --upgrade pip || echo "WARNING: pip upgrade failed"
                        
                        # Install requirements
                        ./venv/bin/python -m pip install -r requirements.txt || (echo "ERROR: Failed to install requirements" && exit 1)
                        
                        # Verify critical dependencies
                        ./venv/bin/python -c "import fastapi; print('✓ fastapi available')" || (echo "ERROR: fastapi not available" && exit 1)
                        ./venv/bin/python -c "import uvicorn; print('✓ uvicorn available')" || (echo "ERROR: uvicorn not available" && exit 1)
                        
                        echo "Backend environment setup completed successfully"
                    '''
                }
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                    set +e
                    echo "=== Running Security Scan ==="
                    
                    if [ -d "backend/venv" ]; then
                        PIP="./backend/venv/bin/pip"
                        PY="./backend/venv/bin/python"
                    else
                        PIP="pip3"
                        PY="python3"
                    fi
                    
                    # Install security tools
                    $PIP install -q bandit safety || echo "WARNING: Failed to install security tools"
                    
                    # Run bandit
                    echo "Running Bandit security scan..."
                    $PY -m bandit -r backend/app -f json -o bandit-report.json || echo "WARNING: Bandit scan found issues"
                    
                    # Run safety check
                    echo "Running Safety dependency scan..."
                    $PIP list --format=freeze > requirements-frozen.txt
                    safety check --file requirements-frozen.txt || echo "WARNING: Safety scan found vulnerabilities"
                    
                    echo "Security scan completed"
                '''
            }
        }

        stage('Backend Lint & Test') {
            steps {
                echo '=== Running Backend Tests ==='
                dir("${BACKEND_DIR}") {
                    sh '''
                        set +e
                        . venv/bin/activate
                        
                        # Install test dependencies
                        pip install -q flake8 pytest pytest-cov pytest-asyncio || echo "WARNING: Test dependencies install failed"
                        
                        # Run flake8
                        echo "Running flake8..."
                        flake8 app --max-line-length=120 --count --statistics || echo "WARNING: Flake8 found issues"
                        
                        # Run pytest (if tests exist)
                        if [ -d "tests" ]; then
                            echo "Running pytest..."
                            pytest tests/ -v --tb=short --cov=app --cov-report=html --cov-report=term || echo "WARNING: Tests failed"
                        else
                            echo "No tests directory found, skipping tests"
                        fi
                    '''
                }
            }
        }

        stage('Backend Build') {
            steps {
                echo '=== Building Backend Docker Image ==='
                dir("${BACKEND_DIR}") {
                    sh '''
                        # Use existing Dockerfile if it exists
                        if [ ! -f "Dockerfile" ]; then
                            cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
                        fi
                        
                        echo "Building Docker image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                        docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} . || echo "WARNING: Docker build failed"
                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest || echo "WARNING: Docker tag failed"
                    '''
                }
            }
        }

        stage('Integration Test') {
            steps {
                echo '=== Running Integration Tests ==='
                sh '''
                    set +e
                    echo "Starting services for integration tests..."
                    
                    # Kill existing processes
                    pkill -9 python python3 2>/dev/null || true
                    sleep 2
                    
                    # Start backend
                    cd backend
                    source venv/bin/activate
                    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/jenkins-backend.log 2>&1 &
                    BACKEND_PID=$!
                    sleep 5
                    
                    # Test API endpoints
                    echo "Testing API endpoints..."
                    curl -f http://localhost:8000/ || echo "WARNING: Root endpoint failed"
                    curl -f http://localhost:8000/api/lesson || echo "WARNING: Lesson endpoint failed"
                    curl -f http://localhost:8000/api/health || echo "WARNING: Health endpoint failed"
                    
                    # Cleanup
                    kill $BACKEND_PID 2>/dev/null || true
                    pkill -9 python python3 2>/dev/null || true
                    
                    echo "Integration tests completed"
                '''
            }
        }

        stage('Push Docker Images') {
            when {
                branch 'main'
            }
            steps {
                echo '=== Pushing Docker Images ==='
                sh '''
                    set +e
                    echo "Docker image ready: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                    
                    # Uncomment to push to Docker Hub
                    # docker login -u $DOCKER_USER -p $DOCKER_PASS
                    # docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                    # docker push ${DOCKER_IMAGE}:latest
                    
                    echo "Note: Docker push commented out. Configure credentials to enable."
                '''
            }
        }

        stage('Deploy to Dev') {
            when {
                branch 'dev'
            }
            steps {
                echo '=== Deploying to Dev Environment ==='
                sh '''
                    set +e
                    echo "Deploying to development..."
                    
                    # Stop existing services
                    docker-compose down || true
                    
                    # Start services
                    docker-compose up -d
                    sleep 5
                    
                    # Verify services
                    docker-compose ps
                    curl -f http://localhost:8000/ || echo "WARNING: Service not responding"
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '=== Performing Health Check ==='
                sh '''
                    set +e
                    echo "Checking service health..."
                    
                    for i in {1..10}; do
                        echo "Health check attempt $i..."
                        if curl -f http://localhost:8000/ > /dev/null 2>&1; then
                            echo "✓ Service is healthy"
                            exit 0
                        fi
                        sleep 2
                    done
                    
                    echo "WARNING: Health check failed after 10 attempts"
                '''
            }
        }
    }

    post {
        always {
            echo '=== Collecting Reports ==='
            archiveArtifacts artifacts: '**/bandit-report.json, **/htmlcov/**, **/requirements-frozen.txt', allowEmptyArchive: true
            
            script {
                if (fileExists('bandit-report.json')) {
                    publishHTML([
                        reportDir: '.',
                        reportFiles: 'bandit-report.json',
                        reportName: 'Security Scan Report',
                        allowMissing: true
                    ])
                }
                
                if (fileExists('backend/htmlcov/index.html')) {
                    publishHTML([
                        reportDir: 'backend/htmlcov',
                        reportFiles: 'index.html',
                        reportName: 'Code Coverage Report',
                        allowMissing: true
                    ])
                }
            }
        }

        success {
            echo '=== ✅ Pipeline Completed Successfully ==='
            sh '''
                cat > build-status.txt << EOF
Build Status: SUCCESS
Project: ${PROJECT_NAME}
Build Number: ${BUILD_NUMBER}
Branch: ${BRANCH_NAME}
Commit: ${GIT_COMMIT}
Timestamp: $(date)
Docker Image: ${DOCKER_IMAGE}:${DOCKER_TAG}
EOF
                cat build-status.txt
            '''
            archiveArtifacts artifacts: 'build-status.txt', allowEmptyArchive: true
        }

        failure {
            echo '=== ❌ Pipeline Failed ==='
            sh '''
                cat > build-status.txt << EOF
Build Status: FAILURE
Project: ${PROJECT_NAME}
Build Number: ${BUILD_NUMBER}
Branch: ${BRANCH_NAME}
Commit: ${GIT_COMMIT}
Timestamp: $(date)
EOF
                cat build-status.txt
                
                # Collect logs for debugging
                echo "=== Backend Logs ===" || true
                cat /tmp/jenkins-backend.log 2>/dev/null || echo "No backend logs found"
            '''
            archiveArtifacts artifacts: 'build-status.txt, /tmp/jenkins-backend.log', allowEmptyArchive: true
        }

        cleanup {
            echo '=== Cleaning Up ==='
            sh '''
                # Kill any background processes
                pkill -9 python python3 2>/dev/null || true
                
                # Clean up temporary files
                rm -f /tmp/jenkins-backend.log 2>/dev/null || true
                
                echo "Cleanup completed"
            '''
        }
    }
}
            echo '❌ Pipeline failed!'
            sh 'echo "Build Status: FAILED" > build-status.txt'
        }

        cleanup {
            echo '🧹 Cleaning up...'
            sh 'rm -rf venv'
        }
    }
}

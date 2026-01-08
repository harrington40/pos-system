# macOS Jenkins Agent Setup Guide

Complete guide to set up a macOS Jenkins agent for iOS builds.

## Prerequisites

- macOS machine (physical Mac or virtual machine)
- Jenkins master server running and accessible
- SSH access to the macOS machine
- Admin privileges on macOS

## Step 1: Prepare macOS Machine

### Install Required Software

On your macOS machine, open Terminal and run:

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java (required for Jenkins agent)
brew install openjdk@11

# Add Java to PATH
echo 'export PATH="/usr/local/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify Java installation
java -version

# Install Git
brew install git

# Install Flutter
git clone https://github.com/flutter/flutter.git -b stable ~/flutter
export PATH="$PATH:$HOME/flutter/bin"
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc

# Verify Flutter
flutter --version
flutter doctor
```

### Install Xcode

1. Open **App Store**
2. Search for **Xcode**
3. Click **Install** (this may take 30-60 minutes)
4. After installation, open Xcode and accept the license agreement
5. Install Xcode Command Line Tools:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcode-select --install
```

### Install CocoaPods

```bash
sudo gem install cocoapods
pod setup
```

### Verify All Tools

```bash
# Check all required tools
flutter doctor -v
xcodebuild -version
pod --version
git --version
java -version
```

## Step 2: Configure SSH Access

### On macOS Machine

1. **Enable Remote Login:**
   - Open **System Preferences**
   - Go to **Sharing**
   - Check **Remote Login**
   - Note: "Remote Login: On"

2. **Create Jenkins User (Optional but recommended):**

```bash
# Create a user for Jenkins
sudo dscl . -create /Users/jenkins
sudo dscl . -create /Users/jenkins UserShell /bin/bash
sudo dscl . -create /Users/jenkins RealName "Jenkins Agent"
sudo dscl . -create /Users/jenkins UniqueID 503
sudo dscl . -create /Users/jenkins PrimaryGroupID 20
sudo dscl . -create /Users/jenkins NFSHomeDirectory /Users/jenkins
sudo dscl . -passwd /Users/jenkins YourSecurePassword

# Create home directory
sudo createhomedir -c -u jenkins

# Add to admin group (for sudo access)
sudo dseditgroup -o edit -a jenkins -t user admin
```

### On Jenkins Master

Generate SSH key for Jenkins:

```bash
# On Jenkins master server
ssh-keygen -t rsa -b 4096 -f ~/.ssh/jenkins_macos_key -N ""
```

Copy the public key to macOS:

```bash
# Copy public key to macOS
ssh-copy-id -i ~/.ssh/jenkins_macos_key.pub jenkins@MACOS_IP_ADDRESS

# Test SSH connection
ssh -i ~/.ssh/jenkins_macos_key jenkins@MACOS_IP_ADDRESS
```

## Step 3: Add macOS Agent in Jenkins

### Method 1: Via Jenkins Web UI

1. **Go to Jenkins Dashboard**
   - https://jenkins.transtechologies.com

2. **Navigate to Node Management:**
   - Click **Manage Jenkins**
   - Click **Manage Nodes and Clouds**

3. **Create New Node:**
   - Click **New Node**
   - Node name: `macos-agent` (or any name you prefer)
   - Select **Permanent Agent**
   - Click **Create**

4. **Configure Node Settings:**

   **General:**
   - Name: `macos-agent`
   - Description: `macOS agent for iOS builds`
   - Number of executors: `2` (or based on CPU cores)
   - Remote root directory: `/Users/jenkins/jenkins-agent`
   - Labels: `macos ios` (space-separated)
   - Usage: `Only build jobs with label expressions matching this node`

   **Launch method:**
   - Select: `Launch agents via SSH`
   
   **SSH Settings:**
   - Host: `YOUR_MACOS_IP_ADDRESS`
   - Credentials: Click **Add** → **Jenkins**
     - Kind: `SSH Username with private key`
     - Scope: `Global`
     - ID: `macos-ssh-key`
     - Username: `jenkins` (or your macOS username)
     - Private Key: Click **Enter directly**
       - Paste the content of `~/.ssh/jenkins_macos_key`
     - Click **Add**
   - Select the credential you just created
   - Host Key Verification Strategy: `Manually trusted key Verification Strategy`

   **Availability:**
   - Keep this agent online as much as possible

5. **Click Save**

6. **Verify Connection:**
   - Go to **Manage Nodes and Clouds**
   - You should see `macos-agent` in the list
   - Status should be: 🟢 (green circle) indicating it's online
   - If red, click on the node and check the log for errors

### Method 2: Via Configuration Script

Alternatively, save this to a file and run in Jenkins Script Console:

```groovy
import jenkins.model.*
import hudson.model.*
import hudson.slaves.*
import hudson.plugins.sshslaves.*

// Configuration
def agentName = 'macos-agent'
def agentDescription = 'macOS agent for iOS builds'
def agentRemoteFS = '/Users/jenkins/jenkins-agent'
def agentLabels = 'macos ios'
def agentExecutors = 2
def agentHost = 'YOUR_MACOS_IP_ADDRESS'
def agentCredentialsId = 'macos-ssh-key'

// Create launcher
def launcher = new SSHLauncher(
    agentHost,
    22,
    agentCredentialsId,
    null,  // jvmOptions
    null,  // javaPath
    null,  // prefixStartSlaveCmd
    null,  // suffixStartSlaveCmd
    60,    // launchTimeoutSeconds
    3,     // maxNumRetries
    10     // retryWaitTime
)

// Create agent
def agent = new DumbSlave(
    agentName,
    agentRemoteFS,
    launcher
)

agent.setNodeDescription(agentDescription)
agent.setNumExecutors(agentExecutors)
agent.setLabelString(agentLabels)
agent.setMode(Node.Mode.EXCLUSIVE)
agent.setRetentionStrategy(new RetentionStrategy.Always())

// Add to Jenkins
Jenkins.instance.addNode(agent)

println "Agent '${agentName}' created successfully"
```

## Step 4: Configure iOS Pipeline Job

Update the iOS pipeline job to use the macOS agent:

1. Go to **Phonetics-App-iOS** job
2. Click **Configure**
3. Check **Restrict where this project can be run**
4. Label Expression: `macos`
5. Click **Save**

## Step 5: Test the Setup

### Test 1: Verify Agent Connection

1. Go to **Manage Jenkins** → **Manage Nodes and Clouds**
2. Click on `macos-agent`
3. Status should show: **Connected** 🟢
4. Click **Log** to see connection details

### Test 2: Run System Info Script

On the agent, run this in Jenkins Script Console (Build → Execute shell):

```bash
echo "=== System Information ==="
uname -a
echo ""
echo "=== Xcode Version ==="
xcodebuild -version
echo ""
echo "=== Flutter Version ==="
flutter --version
echo ""
echo "=== CocoaPods Version ==="
pod --version
echo ""
echo "=== Java Version ==="
java -version
```

### Test 3: Run iOS Pipeline Build

1. Go to **Phonetics-App-iOS** job
2. Click **Build Now**
3. Monitor the build in **Console Output**
4. First build may take 10-15 minutes

Expected console output:
```
Running on macos-agent in /Users/jenkins/jenkins-agent/workspace/Phonetics-App-iOS
=== iOS Build Pipeline ===
...
```

## Troubleshooting

### Agent Shows Offline

**Problem**: Agent appears offline or disconnected

**Solutions:**

1. **Check SSH connectivity:**
   ```bash
   ssh -i ~/.ssh/jenkins_macos_key jenkins@MACOS_IP_ADDRESS
   ```

2. **Check Java installation on macOS:**
   ```bash
   java -version
   ```

3. **Check Jenkins agent log:**
   - Go to agent page in Jenkins
   - Click **Log**
   - Look for error messages

4. **Restart agent:**
   - Click **Disconnect**
   - Click **Launch agent**

### Permission Denied Errors

**Problem**: Build fails with permission errors

**Solutions:**

1. **Check file permissions:**
   ```bash
   ls -la /Users/jenkins/jenkins-agent/
   ```

2. **Fix ownership:**
   ```bash
   sudo chown -R jenkins:staff /Users/jenkins/jenkins-agent/
   ```

3. **Check keychain access for signing:**
   ```bash
   security unlock-keychain -p YOUR_PASSWORD
   ```

### Flutter Not Found

**Problem**: "flutter: command not found"

**Solutions:**

1. **Add Flutter to PATH in agent config:**
   - Go to agent configuration
   - Add Environment Variable:
     - Name: `PATH`
     - Value: `$PATH:/Users/jenkins/flutter/bin`

2. **Or update .bashrc/.zshrc:**
   ```bash
   echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
   ```

### Xcode License Not Accepted

**Problem**: Build fails with Xcode license error

**Solution:**
```bash
sudo xcodebuild -license accept
```

### CocoaPods Install Fails

**Problem**: "pod install" fails in iOS build

**Solutions:**

1. **Update CocoaPods:**
   ```bash
   sudo gem update cocoapods
   pod repo update
   ```

2. **Clear CocoaPods cache:**
   ```bash
   pod cache clean --all
   rm -rf ~/Library/Caches/CocoaPods
   ```

### Code Signing Issues

**Problem**: "No signing certificate found"

**Solutions:**

1. **Install certificates in Keychain:**
   - Open Xcode
   - Preferences → Accounts
   - Add Apple ID
   - Download manual profiles

2. **Or disable signing for testing:**
   ```bash
   flutter build ios --release --no-codesign
   ```

## Security Best Practices

### 1. Use SSH Keys (Not Passwords)

- Always use SSH key authentication
- Never use password authentication for Jenkins
- Keep private keys secure

### 2. Limit Agent Access

- Use dedicated Jenkins user
- Restrict sudo access
- Use least privilege principle

### 3. Network Security

- Use VPN for Jenkins-agent communication
- Configure firewall rules
- Use private network if possible

### 4. Keep Software Updated

```bash
# Regular updates
brew update && brew upgrade
sudo softwareupdate -i -a
```

## Maintenance

### Regular Tasks

**Weekly:**
- Check agent disk space
- Review build logs
- Update CocoaPods: `pod repo update`

**Monthly:**
- Update Flutter: `flutter upgrade`
- Update Xcode (from App Store)
- Update gems: `sudo gem update`

**Quarterly:**
- Review and clean workspace
- Update OS: `sudo softwareupdate -i -a`
- Rotate SSH keys

### Monitoring

Add monitoring to agent:

```bash
# Check disk space
df -h

# Check memory
top -l 1 | grep PhysMem

# Check running processes
ps aux | grep jenkins
```

## Advanced Configuration

### Multiple Executors

For faster builds, increase executors:
- 2 executors: Standard (2-4 core Mac)
- 4 executors: High-end (6-8 core Mac)
- 8 executors: Mac Pro (12+ cores)

### Build Caching

Speed up builds with caching:

```bash
# Cache Flutter dependencies
export PUB_CACHE="/Users/jenkins/.pub-cache"

# Cache CocoaPods
export CP_HOME_DIR="/Users/jenkins/.cocoapods"
```

### Agent Labels

Use multiple labels for flexibility:

- `macos` - General macOS builds
- `ios` - iOS-specific builds
- `xcode14` - Specific Xcode version
- `m1` - Apple Silicon Macs
- `intel` - Intel Macs

## Quick Reference

### Agent Status Commands

```bash
# Check agent status
ssh jenkins@MACOS_IP ls -la jenkins-agent/

# Restart agent (from Jenkins UI)
# Go to agent page → Disconnect → Launch

# View agent log
# Jenkins UI → Manage Nodes → macos-agent → Log
```

### Common Directories

- Agent workspace: `/Users/jenkins/jenkins-agent/workspace/`
- Flutter cache: `~/.pub-cache`
- CocoaPods cache: `~/Library/Caches/CocoaPods`
- Xcode derived data: `~/Library/Developer/Xcode/DerivedData`

### Environment Variables

Set in Jenkins agent configuration:

- `FLUTTER_HOME`: `/Users/jenkins/flutter`
- `COCOAPODS_DISABLE_STATS`: `true`
- `FASTLANE_SKIP_UPDATE_CHECK`: `true`

---

## Next Steps

After setup is complete:

1. ✅ Verify agent is online and green
2. ✅ Test with a simple build
3. ✅ Configure iOS code signing
4. ✅ Set up TestFlight deployment
5. ✅ Monitor first few builds
6. ✅ Document any custom configuration

---

**Need Help?**

- Check agent logs in Jenkins UI
- SSH to macOS and check: `/Users/jenkins/jenkins-agent/agent.log`
- Review system logs: `Console.app` on macOS
- Verify Xcode: Open Xcode and check settings

**Agent Working? Run iOS build:**
```
Jenkins → Phonetics-App-iOS → Build Now
```

Success! 🎉

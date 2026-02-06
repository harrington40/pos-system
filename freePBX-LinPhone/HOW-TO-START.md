# 🚀 How to Start the Smart SIP Web Application

This guide shows you **3 different ways** to start the web application development server.

---

## ⚡ Quick Start (Recommended)

### Option 1: Windows Batch File (Easiest)

1. Navigate to the project folder:
   ```
   C:\Users\harri\designProject2020\freePBX-LinPhone
   ```

2. **Double-click** the file:
   ```
   START-WEB.bat
   ```

3. The batch file will:
   - ✅ Check if Node.js is installed
   - ✅ Start the development server
   - ✅ Automatically open http://localhost:5173 in your browser
   - ✅ Press any key to stop the server when done

---

### Option 2: Node.js Script

1. Open **Windows PowerShell** or **Command Prompt**

2. Navigate to the project:
   ```cmd
   cd C:\Users\harri\designProject2020\freePBX-LinPhone
   ```

3. Run the start script:
   ```cmd
   node start-server.js
   ```

4. Open your browser to: **http://localhost:5173**

5. Press **Ctrl+C** to stop the server

---

### Option 3: NPM Command (Traditional)

1. Open your terminal (PowerShell, CMD, or WSL)

2. Navigate to the project:
   ```bash
   cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
   ```

3. Run the development command:
   ```bash
   npm run dev:web
   ```

4. Wait for the message:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

5. Open your browser to: **http://localhost:5173**

6. Press **Ctrl+C** to stop the server

---

## 🔍 Troubleshooting

### Problem: "ERR_CONNECTION_REFUSED"

**Cause:** The development server is not running.

**Solution:**
1. Make sure you've started the server using one of the methods above
2. Wait 5-10 seconds for the server to fully start
3. Look for the message: `Local: http://localhost:5173/`
4. Then open/refresh your browser

---

### Problem: "Port 5173 already in use"

**Cause:** Another instance is already running.

**Solution:**
1. Close any other terminals running the dev server
2. Or kill the process:
   - **Windows:** 
     ```cmd
     taskkill /F /IM node.exe
     ```
   - **Linux/WSL:**
     ```bash
     pkill -f vite
     ```
3. Start the server again

---

### Problem: "npm: command not found"

**Cause:** Node.js is not installed or not in PATH.

**Solution:**
1. Download and install Node.js from: https://nodejs.org
2. Choose the **LTS version** (v18.x or higher)
3. Restart your terminal after installation
4. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

---

### Problem: "Module not found" or "Cannot find package"

**Cause:** Dependencies are not installed.

**Solution:**
1. Navigate to project root:
   ```bash
   cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Wait for installation to complete (may take 2-5 minutes)

4. Try starting the server again

---

## 📱 What You'll See

Once the server starts successfully, you should see:

### In Terminal:
```
VITE v4.4.5  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help
```

### In Browser (http://localhost:5173):
- **Smart SIP Dashboard** with purple gradient background
- **Sidebar navigation** (Dashboard, Calls, Agents, Queues, Analytics, Settings)
- **Active call panel** with call controls
- **Agent status** cards
- **Real-time statistics**

---

## 🎨 Application Features

The web UI includes:

### Dashboard Page
- Real-time statistics (active calls, available agents, queue length)
- Active call control panel (mute, hold, hangup)
- Agent status overview
- Connection status indicator

### Call Management
- Make outbound calls
- Answer incoming calls
- Hold/Resume calls
- Mute/Unmute microphone
- DTMF (dial pad) tones
- Call transfer

### Agent Management
- View all agents
- Update agent status (available, busy, break, offline)
- Assign skills to agents
- View agent call history

### Queue Monitoring
- View queue statistics
- Monitor waiting calls
- See queue wait times
- Manage queue priorities

### Analytics
- Call volume charts
- Agent performance metrics
- Queue efficiency stats
- Real-time dashboards

### Settings
- SIP server configuration
- WebSocket connection settings
- Audio device selection
- Notification preferences

---

## 🔗 Important URLs

- **Web Application:** http://localhost:5173
- **Backend API:** http://localhost:3000 (when backend is running)
- **OrientDB Studio:** http://localhost:2480 (when OrientDB is running)

---

## 🛠️ Advanced: Running Multiple Components

For full functionality, you need to run:

### 1. Start Backend API (separate terminal):
```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:backend
```
Backend runs on: **http://localhost:3000**

### 2. Start Web App (separate terminal):
```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:web
```
Web app runs on: **http://localhost:5173**

### 3. Start KeyDB (Redis cache):
```bash
sudo systemctl start keydb
# or
keydb-server
```

### 4. Start OrientDB (database):
```bash
sudo systemctl start orientdb
# or
/path/to/orientdb/bin/server.sh
```

### 5. Ensure Asterisk is Running (PBX):
```bash
sudo systemctl start asterisk
sudo asterisk -rx "core show version"
```

---

## 💡 Quick Tips

1. **Hot Reload:** Changes to code automatically refresh the browser
2. **Console Logs:** Press F12 to open browser developer tools
3. **Network Tab:** Monitor API calls and WebSocket connections
4. **Multiple Terminals:** Run backend and frontend in separate terminals
5. **Stopping:** Always use Ctrl+C to stop servers gracefully

---

## 📞 Next Steps

After the web app is running:

1. **Configure SIP Settings:**
   - Go to Settings page
   - Enter your SIP server details (WebSocket URL, credentials)

2. **Test Connection:**
   - Click "Connect" button
   - Watch for green "Connected" indicator

3. **Make a Test Call:**
   - Click "Make Call" button
   - Enter extension or SIP URI (e.g., `6001` or `sip:6001@localhost`)
   - Test call controls (mute, hold, hangup)

4. **Explore Other Pages:**
   - View agents in Agents page
   - Monitor queues in Queues page
   - Check analytics in Analytics page

---

## 📚 More Documentation

- [Quick Reference Guide](./QUICK_REFERENCE.md) - Commands and troubleshooting
- [Installation Guide](./INSTALL.md) - Full system setup
- [Backend API Documentation](./docs/backend-api.md) - API reference
- [SIP Integration Guide](./docs/sip-integration.md) - SIP.js configuration

---

## ⚠️ Common Mistakes

❌ **Mistake:** Opening `index.html` directly in browser
✅ **Correct:** Must run the development server first

❌ **Mistake:** Running `npm run dev` in project root
✅ **Correct:** Use `npm run dev:web` or go to `apps/web` folder

❌ **Mistake:** Expecting it to work without backend
✅ **Correct:** Some features require backend API to be running

---

## 🆘 Still Having Issues?

If none of the above solutions work:

1. **Check the logs:** Look for error messages in the terminal
2. **Verify Node.js version:** Should be v18 or higher
3. **Clear cache:**
   ```bash
   npm run clean
   npm install
   ```
4. **Check firewall:** Ensure port 5173 is not blocked
5. **Try a different port:** Edit `vite.config.ts` to change port

---

**Ready?** Choose one of the startup methods above and you'll have the UI running in seconds! 🎉

# 🚀 STARTUP SCRIPTS - Quick Reference

This directory contains multiple startup scripts for different environments.

---

## 📜 Available Scripts

### For WSL/Linux Terminal:

#### **start-web-wsl.sh** (Recommended for WSL)
Full-featured startup script with checks and status messages.

**Usage:**
```bash
./start-web-wsl.sh
```

**Features:**
- ✅ Checks Node.js installation
- ✅ Auto-installs dependencies if needed
- ✅ Shows clear status messages
- ✅ Runs from any location

---

#### **start.sh** (Simple & Fast)
Minimal script using npm workspace command.

**Usage:**
```bash
./start.sh
```

**Requirements:**
- Must be run from project root directory
- Dependencies must already be installed

---

### For Windows:

#### **START-WEB.bat**
Windows batch file with automatic browser opening.

**Usage:**
- Double-click the file in Windows Explorer
- Or run from Command Prompt: `START-WEB.bat`

---

#### **start-server.js**
Node.js startup script (cross-platform).

**Usage:**
```bash
node start-server.js
```

---

## 🎯 Quick Start Guide

### Method 1: Using the Full Script (Recommended)

1. Open WSL terminal
2. Navigate to project:
   ```bash
   cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
   ```
3. Run the script:
   ```bash
   bash start-web-wsl.sh
   ```
   (Note: Use `bash` command to avoid permission issues)

---

### Method 2: Using the Simple Script

```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
bash start.sh
```

---

### Method 3: Direct Command

```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:web
```

---

### Method 4: From Web Directory

```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone/apps/web
npm run dev
```

---

## 🔧 Making Scripts Executable (Optional)

If you want to run scripts with `./` prefix:

```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
chmod +x start-web-wsl.sh start.sh
```

Then you can run:
```bash
./start-web-wsl.sh
```

---

## 🌐 Accessing the Application

Once the server starts, you'll see:
```
➜  Local:   http://localhost:5173/
```

Open your browser to: **http://localhost:5173**

---

## 🛑 Stopping the Server

Press **Ctrl + C** in the terminal

---

## ❓ Troubleshooting

### Script won't run (Permission Denied)

**Solution:** Use `bash` command:
```bash
bash start-web-wsl.sh
```

### Port Already in Use

**Solution:** Kill existing process:
```bash
pkill -f vite
# or
lsof -ti:5173 | xargs kill -9
```

Then try again.

### Module Not Found

**Solution:** Install dependencies:
```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm install
```

### Command Not Found

**Solution:** Make sure you're in the correct directory:
```bash
pwd
# Should show: /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
```

---

## 📊 What Each Script Does

| Script | Platform | Auto-installs | Opens Browser | Best For |
|--------|----------|---------------|---------------|----------|
| `start-web-wsl.sh` | WSL/Linux | ✅ | ❌ | Development |
| `start.sh` | WSL/Linux | ❌ | ❌ | Quick starts |
| `START-WEB.bat` | Windows | ❌ | ✅ | Windows users |
| `start-server.js` | All | ❌ | ❌ | Cross-platform |
| `npm run dev:web` | All | ❌ | ❌ | Standard npm |

---

## 💡 Pro Tips

1. **Bookmark the script:** Create an alias in your `.bashrc`:
   ```bash
   alias start-web='cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone && bash start-web-wsl.sh'
   ```

2. **Run in background:**
   ```bash
   bash start-web-wsl.sh &
   ```

3. **View logs:**
   ```bash
   bash start-web-wsl.sh 2>&1 | tee web-server.log
   ```

---

## 🚀 Recommended Quick Start

**Just copy and paste this into your WSL terminal:**

```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone && bash start-web-wsl.sh
```

That's it! The script handles everything else. 🎉

---

**Questions?** Check [HOW-TO-START.md](./HOW-TO-START.md) for detailed troubleshooting.

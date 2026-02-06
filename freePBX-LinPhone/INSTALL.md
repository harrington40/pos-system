# Quick Installation Guide

## 🚀 5-Minute Setup

Get your Smart SIP Platform running in 5 minutes!

### Step 1: Install Dependencies (1 min)

```bash
# Navigate to project directory
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone

# Install all dependencies
npm install
```

This installs dependencies for:
- Backend (NestJS)
- Web app (React + Vite)
- Mobile app (React Native)
- All shared packages

### Step 2: Start Services (2 min)

**Terminal 1 - Start OrientDB:**
```bash
# If not installed, download from https://orientdb.org/download
cd /path/to/orientdb
bin/server.sh
```

**Terminal 2 - Start KeyDB:**
```bash
keydb-server
# Or: brew services start keydb (macOS)
# KeyDB is a high-performance Redis fork, fully compatible
```

**Terminal 3 - Start Backend:**
```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:backend
```

Wait for: `🚀 Smart SIP Backend running on: http://localhost:3000/api`

### Step 3: Start Web App (1 min)

**Terminal 4:**
```bash
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:web
```

Wait for: `Local: http://localhost:5173`

### Step 4: Open Browser (1 min)

Open http://localhost:5173

You should see the Smart SIP dashboard!

---

## ✅ Verify Installation

### Check Backend

```bash
curl http://localhost:3000/api/agents
# Should return: []
```

### Check OrientDB

Open http://localhost:2480 in browser:
- Username: `admin`
- Password: `admin`
- Database: `smart_sip`

### Check KeyDB

```bash
keydb-cli ping
# Should return: PONG

# Or using redis-cli (KeyDB is Redis-compatible)
redis-cli ping
```

---

## 📝 Create Test Data

### Create an Agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "email": "agent@test.com",
    "sipExtension": "6001",
    "maxConcurrentCalls": 2,
    "skills": [
      {
        "name": "Support",
        "category": "general",
        "level": 5
      }
    ]
  }'
```

### Create a Queue

```bash
curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Support",
    "extension": "5000",
    "priority": 1,
    "maxWaitTime": 300,
    "strategy": "least_busy"
  }'
```

---

## 🔧 Troubleshooting

### Port Already in Use

If ports are busy:

```bash
# Backend (port 3000)
lsof -ti:3000 | xargs kill -9

# Web (port 5173)
lsof -ti:5173 | xargs kill -9

# OrientDB (port 2424)
lsof -ti:2424 | xargs kill -9

# KeyDB (port 6379)
lsof -ti:6379 | xargs kill -9
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
npm install
```

### TypeScript Errors

```bash
# Rebuild shared packages
npm run build --workspace=packages/shared
npm run build --workspace=packages/sip-core
npm run build --workspace=packages/smart-routing
```

---

## 🎯 Next Steps

1. **Configure SIP** - See [SIP Integration Guide](./sip-integration.md)
2. **Set up Asterisk** - See [Getting Started](./getting-started.md)
3. **Explore API** - See [Backend API Reference](./backend-api.md)
4. **Configure Routing** - See [Smart Routing Guide](./smart-routing.md)

---

## 📁 Project Structure

```
smart-sip-platform/
├── apps/
│   ├── backend/          # NestJS API (Port 3000)
│   ├── web/              # React Web App (Port 5173)
│   └── mobile/           # React Native App
├── packages/
│   ├── shared/           # TypeScript types & utilities
│   ├── sip-core/         # SIP.js wrapper
│   └── smart-routing/    # Routing algorithms
└── docs/                 # Documentation
```

---

## 🔑 Default Credentials

### OrientDB
- URL: http://localhost:2480
- Username: `admin`
- Password: `admin`
- Database: `smart_sip`

### KeyDB
- Host: `localhost`
- Port: `6379`
- Password: (none)

### Asterisk 21
- Installation: `/usr/src/asterisk-21`
- WebSocket: `wss://localhost:8089/ws`
- SIP Domain: `localhost`

⚠️ **Change all default passwords in production!**

---

## 💡 Quick Commands

```bash
# Start everything
npm run dev:backend &
npm run dev:web &

# Build everything
npm run build

# Clean everything
npm run clean

# Run tests
npm test

# Lint code
npm run lint
```

---

## 📚 Documentation

- [Complete Setup Guide](./getting-started.md)
- [API Reference](./backend-api.md)
- [Database Schema](./database-schema.md)
- [Smart Routing](./smart-routing.md)
- [SIP Integration](./sip-integration.md)

---

## 🆘 Getting Help

Having issues? Try these resources:

1. **Check logs:**
   - Backend: Terminal 3
   - Web: Browser console
   - OrientDB: `/path/to/orientdb/log/orientdb.log`

2. **Review documentation** in `/docs` folder

3. **Test components individually:**
   ```bash
   # Test backend only
   cd apps/backend && npm run dev
   
   # Test web only
   cd apps/web && npm run dev
   ```

---

## ✨ You're Ready!

Your Smart SIP Platform is now running!

- **Dashboard:** http://localhost:5173
- **API:** http://localhost:3000/api
- **OrientDB:** http://localhost:2480

Start by creating agents and queues, then configure your SIP server to start handling calls.

Happy coding! 🎉

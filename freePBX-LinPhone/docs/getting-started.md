# Getting Started with Smart SIP Platform

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **OrientDB** (v3.2 or higher)  
  Download from: https://orientdb.org/download
- **KeyDB** (latest stable) - High-performance Redis fork  
  Install via: `brew install keydb` (macOS) or see https://keydb.dev
- **Asterisk 21** (already installed at /usr/src/asterisk-21) with WebSocket support

## Quick Start

### 1. Clone and Install

```bash
cd /path/to/freePBX-LinPhone
npm install
```

This will install all dependencies for all packages and apps in the monorepo.

### 2. Set Up OrientDB

```bash
# Start OrientDB server
cd /path/to/orientdb
bin/server.sh
```

OrientDB will create the `smart_sip` database automatically on first run.

Default credentials:
- Username: `admin`
- Password: `admin`

**⚠️ Change these in production!**

### 3. Set Up KeyDB

```bash
# Start KeyDB server
keydb-server

# Or with Homebrew (macOS)
brew services start keydb

# Or using Redis compatibility (KeyDB is drop-in replacement)
keydb-server --port 6379
```

### 4. Configure Asterisk 21 21

Asterisk 21 is installed at `/usr/src/asterisk-21`

Edit `/etc/asterisk/http.conf`:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

Edit `/etc/asterisk/pjsip.conf`:

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[6001]
type=endpoint
context=default
disallow=all
allow=ulaw
allow=alaw
auth=6001
aors=6001
webrtc=yes

[6001]
type=auth
auth_type=userpass
password=your_password
username=6001

[6001]
type=aor
max_contacts=5
```

Restart Asterisk:

```bash
sudo systemctl restart asterisk
```

### 5. Configure Backend

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
NODE_ENV=development

# OrientDB
ORIENTDB_HOST=localhost
ORIENTDB_PORT=2424
ORIENTDB_USERNAME=admin
ORIENTDB_PASSWORD=admin
ORIENTDB_DATABASE=smart_sip

# KeyDB
KEYDB_HOST=localhost
KEYDB_PORT=6379

# Asterisk
ASTERISK_HOST=localhost

# SIP
SIP_WSS_SERVER=wss://localhost:8089/ws
SIP_DOMAIN=localhost
```

### 6. Start Development Servers

Open 3 terminal windows:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Web App:**
```bash
npm run dev:web
```

**Terminal 3 - Mobile (optional):**
```bash
npm run dev:mobile
```

### 7. Access the Application

- **Web App:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **API Docs:** http://localhost:3000/api-docs (coming soon)

## First Time Setup

### Create Your First Agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "sipExtension": "6001",
    "maxConcurrentCalls": 2,
    "skills": [
      {
        "name": "Technical Support",
        "category": "support",
        "level": 8
      }
    ]
  }'
```

### Create Your First Queue

```bash
curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Queue",
    "extension": "5000",
    "priority": 1,
    "maxWaitTime": 300,
    "strategy": "skill_based"
  }'
```

## Testing SIP Calls

### Using the Web Client

1. Open http://localhost:5173
2. Go to Settings
3. Configure your SIP credentials:
   - SIP URI: `sip:6001@localhost`
   - WebSocket Server: `wss://localhost:8089/ws`
   - Username: `6001`
   - Password: `your_password`
4. Click "Save Settings"
5. Make a test call from the Dashboard

### Using a SIP Phone

You can also test with any SIP client that supports WebRTC:
- **Linphone** (Desktop/Mobile)
- **MicroSIP** (Windows)
- **SIPML5** (Web)

## Troubleshooting

### OrientDB Connection Issues

```bash
# Check if OrientDB is running
curl http://localhost:2480

# Check logs
tail -f /path/to/orientdb/log/orientdb.log
```

### KeyDB Connection Issues

```bash
# Test KeyDB connection
keydb-cli ping
# Should return: PONG

# Or using redis-cli (KeyDB is compatible)
redis-cli -h localhost -p 6379 ping
```

### Asterisk WebSocket Issues

```bash
# Check Asterisk status
sudo asterisk -rx "core show version"

# Check WebSocket transport
sudo asterisk -rx "pjsip show transports"

# Enable debug logging
sudo asterisk -rx "pjsip set logger on"
```

### SIP Registration Failures

1. Check Asterisk endpoint configuration
2. Verify WebSocket SSL certificate
3. Check browser console for errors
4. Test with `openssl s_client -connect localhost:8089`

## Development Tips

### Hot Reload

All packages support hot reload:
- Backend: Changes auto-restart via `nest start --watch`
- Web: Vite HMR
- Mobile: Expo fast refresh

### Debugging

**Backend:**
```bash
npm run dev:debug --workspace=apps/backend
```
Then attach VSCode debugger to port 9229.

**Web:**
Use browser DevTools. React DevTools extension recommended.

### Database Queries

Access OrientDB Studio: http://localhost:2480

Execute queries:
```sql
SELECT FROM Agent
SELECT FROM Call WHERE state = 'active'
SELECT FROM Queue
```

## Next Steps

- [Backend API Reference](./backend-api.md)
- [Smart Routing Configuration](./smart-routing.md)
- [React Native Setup](./react-native-setup.md)
- [Production Deployment](./deployment.md)

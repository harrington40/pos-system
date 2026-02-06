# Smart SIP Platform

A comprehensive multi-platform SIP communication system with smart routing and AI-powered features.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
├──────────────────────┬──────────────────────────────────┤
│   React Web App      │   React Native (iOS + Android)   │
│   - Tailwind CSS     │   - NativeWind                   │
│   - SIP.js           │   - CallKit (iOS)                │
│   - WebRTC           │   - VoIP Push                    │
└──────────────────────┴──────────────────────────────────┘
                            ↓ WSS (SIP over WebSocket)
┌─────────────────────────────────────────────────────────┐
│                     Backend Layer                        │
├─────────────────────────────────────────────────────────┤
│   Node.js (NestJS)                                      │
│   - SIP Proxy                                           │
│   - Smart Routing Engine                                │
│   - AI Integration                                      │
│   - WebSocket Server                                    │
│   - OrientDB Integration                                │
└─────────────────────────────────────────────────────────┘
                            ↓ SIP
┌─────────────────────────────────────────────────────────┐
│                  PBX Core (Asterisk)                    │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
smart-sip-platform/
├── apps/
│   ├── backend/          # NestJS backend API
│   ├── web/              # React web application
│   └── mobile/           # React Native mobile app
├── packages/
│   ├── shared/           # Shared TypeScript types & utilities
│   ├── sip-core/         # SIP.js integration layer
│   └── smart-routing/    # Smart routing algorithms
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- OrientDB (running locally or remote)
- KeyDB (high-performance Redis fork)
- Asterisk 21 (already installed at /usr/src/asterisk-21)

### Installation

```bash
# Install dependencies
npm install
```

### Start the Web Application

**Option 1: Using Startup Script (Easiest)**
```bash
bash start-web-wsl.sh
```

**Option 2: Windows Batch File**
- Double-click `START-WEB.bat` in Windows Explorer

**Option 3: NPM Command**
```bash
npm run dev:web
```

**Option 4: Direct Command**
```bash
cd apps/web && npm run dev
```

See [STARTUP-SCRIPTS.md](./STARTUP-SCRIPTS.md) for all options and troubleshooting.

### Start Other Components

```bash
# Backend API (separate terminal)
npm run dev:backend

# Mobile app (separate terminal)
npm run dev:mobile
```

## 🎯 Features

### Smart Routing
- **Agent Availability Scoring** - Real-time agent load balancing
- **Skill-Based Routing** - Match calls to best-qualified agents
- **Time-of-Day Rules** - Business hours & timezone handling
- **Priority Queuing** - VIP & emergency call prioritization

### AI-Powered
- **Call Intent Detection** - Automatic call categorization
- **Voice Sentiment Analysis** - Real-time mood detection
- **Predictive Escalation** - Automatic supervisor alerts
- **Auto-Tagging** - Intelligent call classification

### Real-Time Features
- **Live Call Monitoring** - Supervisor dashboard
- **Barge-In Support** - Join active calls
- **Call Transfer** - Attended & blind transfers
- **Conference Calling** - Multi-party support

## 🛠️ Technology Stack

### Frontend
- **React** - Web UI
- **React Native** - Mobile (iOS + Android)
- **TypeScript** - Type safety
- **Tailwind CSS / NativeWind** - Styling
- **SIP.js** - SIP protocol handling
- **WebRTC** - Audio/video streaming
- **Zustand** - State management

### Backend
- **NestJS** - API framework
- **OrientDB** - Graph database
- **KeyDB** - High-performance Redis alternative for real-time state & caching
- **WebSocket** - Real-time communication
- **Node.js** - Runtime

### PBX Integration
- **Asterisk 21** - PBX core (installed at /usr/src/asterisk-21)
- **SIP over WebSocket** - Browser/mobile connectivity

## 📚 Documentation

> **📖 [Complete Documentation Index](./docs/INDEX.md)** - Start here to find the right guide!

### Quick Start
- [Quick Reference Guide](./QUICK_REFERENCE.md) - ⚡ Essential commands and troubleshooting
- [Installation Guide](./INSTALL.md) - Quick installation steps
- [Getting Started Guide](./docs/getting-started.md) - Detailed setup and first steps

### Core Configuration
- [KeyDB Setup Guide](./docs/keydb-setup.md) - High-performance caching configuration
- [Asterisk 21 Configuration](./docs/asterisk21-config.md) - Complete PBX setup for WebRTC/WebSocket
- [OrientDB Schema](./docs/database-schema.md) - Graph database structure

### API & Integration
- [Backend API Documentation](./docs/backend-api.md) - REST API reference
- [SIP Integration Guide](./docs/sip-integration.md) - SIP.js and WebRTC integration
- [Smart Routing Configuration](./docs/smart-routing.md) - Routing algorithms and strategies

### Mobile Development
- [React Native Setup](./docs/react-native-setup.md) - iOS and Android app configuration

## 🔧 Configuration

### Asterisk WebSocket Setup

Asterisk 21 is installed at `/usr/src/asterisk-21`

```ini
; /etc/asterisk/http.conf
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

; /etc/asterisk/pjsip.conf
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
```

### OrientDB Connection

```typescript
{
  host: 'localhost',
  port: 2424,
  username: 'admin',
  password: 'admin',
  database: 'smart_sip'
}
```

### KeyDB Connection

```typescript
{
  host: 'localhost',
  port: 6379,
  password: undefined  // Set password if configured
}
```

## 📱 iOS Considerations

- **CallKit Integration** - Native iOS call UI
- **VoIP Push Notifications** - Background call handling
- **Background Audio** - Persistent audio session

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific workspace tests
npm test --workspace=apps/backend
npm test --workspace=packages/sip-core
```

## 📦 Building for Production

```bash
# Build all packages
npm run build

# Build specific workspace
npm run build --workspace=apps/web
```

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please read our contributing guidelines first.

# Documentation Index

Complete documentation for the Smart SIP Platform.

## 📖 Documentation Structure

### 🚀 Getting Started (Start Here!)

1. **[Quick Reference Guide](../QUICK_REFERENCE.md)**
   - Essential commands reference
   - Default ports and paths
   - Quick troubleshooting
   - **Use this**: When you need quick answers

2. **[Installation Guide](../INSTALL.md)**
   - Step-by-step installation
   - System requirements
   - Quick start commands
   - **Use this**: First-time setup

3. **[Getting Started Guide](./getting-started.md)**
   - Detailed setup walkthrough
   - Creating your first agents and queues
   - Making your first call
   - **Use this**: Learning the platform

---

### ⚙️ Core Configuration

4. **[KeyDB Setup Guide](./keydb-setup.md)**
   - KeyDB vs Redis comparison
   - Installation instructions (Ubuntu, macOS, Docker)
   - Performance tuning for high-volume call centers
   - Backup and recovery
   - Monitoring and troubleshooting
   - **Use this**: Setting up high-performance caching layer

5. **[Asterisk 21 Configuration Guide](./asterisk21-config.md)**
   - Complete WebSocket/WebRTC setup
   - PJSIP endpoint configuration
   - Queue management
   - ARI and AMI configuration
   - Security hardening
   - Performance tuning
   - **Use this**: Configuring the PBX core

6. **[OrientDB Schema](./database-schema.md)**
   - Graph database structure
   - Entity relationships
   - Vertex classes (Agent, Call, Queue, Skill)
   - Edge classes (HandledBy, HasSkill, InQueue)
   - Query examples
   - **Use this**: Understanding data model

---

### 🔌 API & Integration

7. **[Backend API Documentation](./backend-api.md)**
   - REST API reference
   - WebSocket events
   - Request/response examples
   - Authentication
   - Error handling
   - **Use this**: Integrating with the backend

8. **[SIP Integration Guide](./sip-integration.md)**
   - SIP.js configuration
   - WebRTC setup
   - Call flow diagrams
   - DTMF, hold, transfer operations
   - Error handling
   - **Use this**: Building SIP clients

9. **[Smart Routing Configuration](./smart-routing.md)**
   - Routing algorithms explained
   - Weight-based scoring
   - Skill-based routing
   - Priority routing
   - Time-based routing
   - Configuration options
   - **Use this**: Optimizing call distribution

---

### 📱 Mobile Development

10. **[React Native Setup](./react-native-setup.md)**
    - iOS and Android configuration
    - CallKit integration (iOS)
    - VoIP push notifications
    - Native WebRTC setup
    - Build and deployment
    - **Use this**: Building mobile apps

---

## 📚 By Use Case

### I want to install the system
→ Start with [Installation Guide](../INSTALL.md)
→ Then [Getting Started Guide](./getting-started.md)

### I need quick command reference
→ [Quick Reference Guide](../QUICK_REFERENCE.md)

### I'm setting up the PBX
→ [Asterisk 21 Configuration](./asterisk21-config.md)
→ [SIP Integration Guide](./sip-integration.md)

### I'm setting up caching
→ [KeyDB Setup Guide](./keydb-setup.md)

### I'm building a frontend
→ [Backend API Documentation](./backend-api.md)
→ [SIP Integration Guide](./sip-integration.md)

### I'm building iOS/Android apps
→ [React Native Setup](./react-native-setup.md)
→ [SIP Integration Guide](./sip-integration.md)

### I need to understand call routing
→ [Smart Routing Configuration](./smart-routing.md)
→ [Asterisk 21 Configuration](./asterisk21-config.md)

### I'm having problems
→ [Quick Reference Guide](../QUICK_REFERENCE.md) - Troubleshooting section
→ [Asterisk 21 Configuration](./asterisk21-config.md) - Troubleshooting section
→ [KeyDB Setup Guide](./keydb-setup.md) - Troubleshooting section

### I need to optimize performance
→ [KeyDB Setup Guide](./keydb-setup.md) - Performance Tuning section
→ [Asterisk 21 Configuration](./asterisk21-config.md) - Performance Tuning section
→ [Smart Routing Configuration](./smart-routing.md) - Weight configuration

### I need database queries
→ [OrientDB Schema](./database-schema.md)

---

## 📄 By Technology

### Frontend Development
- [SIP Integration Guide](./sip-integration.md) - SIP.js + WebRTC
- [Backend API Documentation](./backend-api.md) - REST + WebSocket
- [React Native Setup](./react-native-setup.md) - Mobile apps

### Backend Development
- [Backend API Documentation](./backend-api.md) - NestJS API
- [OrientDB Schema](./database-schema.md) - Graph database
- [KeyDB Setup Guide](./keydb-setup.md) - Caching layer
- [Smart Routing Configuration](./smart-routing.md) - Routing engine

### DevOps / System Administration
- [Installation Guide](../INSTALL.md) - Initial setup
- [Quick Reference Guide](../QUICK_REFERENCE.md) - Daily operations
- [Asterisk 21 Configuration](./asterisk21-config.md) - PBX management
- [KeyDB Setup Guide](./keydb-setup.md) - Cache management

### Telephony / VoIP
- [Asterisk 21 Configuration](./asterisk21-config.md) - Complete PBX setup
- [SIP Integration Guide](./sip-integration.md) - SIP protocol
- [Smart Routing Configuration](./smart-routing.md) - Call routing

---

## 🎯 By Skill Level

### Beginner (Just Starting)
1. [Installation Guide](../INSTALL.md)
2. [Getting Started Guide](./getting-started.md)
3. [Quick Reference Guide](../QUICK_REFERENCE.md)

### Intermediate (Building Features)
1. [Backend API Documentation](./backend-api.md)
2. [SIP Integration Guide](./sip-integration.md)
3. [Smart Routing Configuration](./smart-routing.md)

### Advanced (System Administration)
1. [Asterisk 21 Configuration](./asterisk21-config.md)
2. [KeyDB Setup Guide](./keydb-setup.md)
3. [OrientDB Schema](./database-schema.md)

### Expert (Performance & Security)
- All performance tuning sections
- All security sections
- All monitoring sections

---

## 📋 Complete File List

| File | Lines | Description |
|------|-------|-------------|
| [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) | ~600 | Quick commands and troubleshooting |
| [INSTALL.md](../INSTALL.md) | ~200 | Installation instructions |
| [getting-started.md](./getting-started.md) | ~400 | Detailed setup guide |
| [keydb-setup.md](./keydb-setup.md) | ~600 | KeyDB configuration guide |
| [asterisk21-config.md](./asterisk21-config.md) | ~800 | Complete Asterisk 21 setup |
| [database-schema.md](./database-schema.md) | ~300 | OrientDB schema reference |
| [backend-api.md](./backend-api.md) | ~500 | REST API documentation |
| [sip-integration.md](./sip-integration.md) | ~600 | SIP.js integration guide |
| [smart-routing.md](./smart-routing.md) | ~400 | Routing algorithms |
| [react-native-setup.md](./react-native-setup.md) | ~400 | Mobile app setup |
| **Total** | **~4,800** | **10 comprehensive guides** |

---

## 🔍 Search Tips

### Finding specific topics:

**Commands**: Look in [Quick Reference Guide](../QUICK_REFERENCE.md)
```bash
grep -n "command_name" QUICK_REFERENCE.md
```

**Configuration**: Look in technology-specific guides
```bash
grep -rn "config_option" docs/
```

**API Endpoints**: Look in [Backend API Documentation](./backend-api.md)
```bash
grep -n "POST\|GET\|PUT\|DELETE" docs/backend-api.md
```

**Troubleshooting**: Every major guide has a troubleshooting section
```bash
grep -n "Troubleshooting\|Error\|Problem" docs/*.md
```

---

## 📞 Support

If you can't find what you need:

1. **Check the Quick Reference** - Most common issues covered
2. **Search the docs** - Use grep or your editor's search
3. **Check logs** - See troubleshooting sections
4. **Review examples** - Each guide has working examples

---

## 🆕 Recent Updates

- **KeyDB Guide** - Added complete KeyDB setup replacing Redis
- **Asterisk 21** - Updated for Asterisk 21 at `/usr/src/asterisk-21`
- **Quick Reference** - New comprehensive command reference
- **Documentation Index** - This file!

---

## 📝 Documentation Standards

Each guide follows this structure:
1. **Overview** - What this technology does
2. **Installation** - How to install it
3. **Configuration** - How to configure it
4. **Usage** - How to use it
5. **Monitoring** - How to monitor it
6. **Troubleshooting** - How to fix common issues
7. **References** - External resources

---

**Need to edit documentation?**

All documentation is in Markdown format:
- Main guides: `/docs/*.md`
- Root guides: `/*.md`

Feel free to contribute improvements!

---

**Last Updated**: 2026
**Total Documentation**: 10 guides, ~4,800 lines
**Maintenance**: Living documentation, updated as platform evolves

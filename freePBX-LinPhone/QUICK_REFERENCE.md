# Smart SIP Platform - Quick Reference

A quick reference guide for administrators and operators.

## System Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Web/Mobile │────▶│ NestJS API   │────▶│  OrientDB   │
│   Clients   │◀────│ + WebSocket  │◀────│  (Graph DB) │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │ WSS/SIP            │ ARI/AMI
       ▼                    ▼
┌─────────────────────────────────────┐  ┌─────────────┐
│       Asterisk 21 PBX               │──│   KeyDB     │
│  - WebSocket Transport (8088/8089)  │  │  (Cache)    │
│  - PJSIP Engine                     │  └─────────────┘
│  - Queue Management                 │
└─────────────────────────────────────┘
```

## Default Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| NestJS API | 3000 | HTTP/WS | Backend API & WebSocket |
| React Web | 5173 | HTTP | Web application (dev) |
| OrientDB | 2424 | Binary | Database connection |
| OrientDB Studio | 2480 | HTTP | Web management UI |
| KeyDB | 6379 | TCP | Cache & real-time state |
| Asterisk SIP | 5060 | UDP/TCP | SIP signaling |
| Asterisk WebSocket | 8088 | WS | WebSocket transport |
| Asterisk WSS | 8089 | WSS | Secure WebSocket |
| Asterisk ARI | 8088 | HTTP | REST API |
| Asterisk AMI | 5038 | TCP | Manager interface |
| RTP Media | 10000-20000 | UDP | Audio/video streams |

## Installation Paths

- **Project Root**: `/mnt/c/Users/harri/designProject2020/freePBX-LinPhone`
- **Asterisk 21**: `/usr/src/asterisk-21`
- **Asterisk Config**: `/etc/asterisk/`
- **OrientDB Data**: `/var/lib/orientdb/databases/`
- **KeyDB Data**: `/var/lib/keydb/`
- **Asterisk Logs**: `/var/log/asterisk/`

## Quick Commands

### Start Services

```bash
# Start KeyDB
sudo systemctl start keydb
sudo systemctl status keydb

# Start OrientDB
sudo systemctl start orientdb
# Or: /path/to/orientdb/bin/server.sh

# Start Asterisk
sudo systemctl start asterisk
sudo systemctl status asterisk

# Start Backend (from project root)
cd /mnt/c/Users/harri/designProject2020/freePBX-LinPhone
npm run dev:backend

# Start Web App (new terminal)
npm run dev:web
```

### Stop Services

```bash
# Stop services
sudo systemctl stop keydb
sudo systemctl stop orientdb
sudo systemctl stop asterisk

# Stop Node.js apps (Ctrl+C in terminal or)
pkill -f "node.*backend"
pkill -f "node.*vite"
```

### Check Service Status

```bash
# All services
sudo systemctl status keydb
sudo systemctl status orientdb
sudo systemctl status asterisk

# Check ports
sudo netstat -tlnp | grep -E "3000|2424|2480|6379|5060|8088|8089"

# Check processes
ps aux | grep -E "keydb|orientdb|asterisk|node"
```

## Asterisk CLI Commands

### Access CLI

```bash
# Connect to Asterisk CLI
sudo asterisk -rvvv

# Exit CLI
exit
# Or Ctrl+C
```

### Essential Commands

```bash
# Show active calls
core show channels

# Show call summary
core show calls

# Show SIP endpoints
pjsip show endpoints

# Show registrations
pjsip show aors

# Show specific endpoint
pjsip show endpoint 6001

# Show queues
queue show

# Show specific queue
queue show support

# Add agent to queue
queue add member PJSIP/6001 to support

# Remove agent from queue
queue remove member PJSIP/6001 from support

# Pause agent (with reason)
queue pause member PJSIP/6001 queue support reason "Break"

# Unpause agent
queue unpause member PJSIP/6001 queue support

# Reload configuration
core reload
pjsip reload
queue reload

# Show WebSocket connections
core show channels like ws

# Enable verbose logging
core set verbose 5

# Enable SIP debugging
pjsip set logger on

# Restart Asterisk
core restart now
```

## Agent Management

### Create Agent via API

```bash
# Create new agent
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "extension": "6004",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "status": "offline",
    "skills": ["sales", "support"]
  }'
```

### Update Agent Status

```bash
# Set agent available
curl -X PATCH http://localhost:3000/agents/6004/status \
  -H "Content-Type: application/json" \
  -d '{"status": "available"}'

# Set agent busy
curl -X PATCH http://localhost:3000/agents/6004/status \
  -H "Content-Type: application/json" \
  -d '{"status": "busy"}'

# Set agent on break
curl -X PATCH http://localhost:3000/agents/6004/status \
  -H "Content-Type: application/json" \
  -d '{"status": "break"}'

# Set agent offline
curl -X PATCH http://localhost:3000/agents/6004/status \
  -H "Content-Type: application/json" \
  -d '{"status": "offline"}'
```

### List Agents

```bash
# Get all agents
curl http://localhost:3000/agents

# Get available agents
curl http://localhost:3000/agents?status=available

# Get specific agent
curl http://localhost:3000/agents/6001
```

## Queue Management

### Create Queue

```bash
curl -X POST http://localhost:3000/queues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Queue",
    "strategy": "skill-based",
    "maxWaitTime": 300,
    "priority": 5
  }'
```

### Queue Statistics

```bash
# Get queue stats
curl http://localhost:3000/queues/support/stats

# Get all queues
curl http://localhost:3000/queues
```

## KeyDB Operations

### Connect to KeyDB

```bash
# Using keydb-cli
keydb-cli

# Or redis-cli (compatible)
redis-cli -h localhost -p 6379
```

### Common Commands

```bash
# Ping server
PING

# Check memory usage
INFO memory

# Get all keys (careful in production!)
KEYS *

# Get agent state
GET agent:6001

# Get call state
GET call:abc123

# Check queue length
LLEN queue:support

# View queue contents
LRANGE queue:support 0 -1

# Monitor commands in real-time
MONITOR

# Get statistics
INFO stats

# Flush all data (CAUTION!)
FLUSHALL
```

## OrientDB Management

### Access Studio

Open browser: http://localhost:2480

Default credentials:
- **Username**: `root`
- **Password**: `root_password` (change in production!)

### Console Commands

```bash
# Connect to database
orientdb> CONNECT remote:localhost/smart_sip root root_password

# List all classes
orientdb> SELECT expand(classes) FROM metadata:schema

# Count records
orientdb> SELECT count(*) FROM Agent
orientdb> SELECT count(*) FROM Call
orientdb> SELECT count(*) FROM Queue

# View agents
orientdb> SELECT * FROM Agent

# View calls
orientdb> SELECT * FROM Call ORDER BY startTime DESC LIMIT 10

# Find available agents
orientdb> SELECT * FROM Agent WHERE status = 'available'

# Find agent with skills
orientdb> SELECT expand(out('HasSkill')) FROM Agent WHERE extension = '6001'

# View agent call history
orientdb> SELECT expand(in('HandledBy')) FROM Agent WHERE extension = '6001'
```

## Monitoring & Logs

### View Logs

```bash
# Asterisk logs
sudo tail -f /var/log/asterisk/full
sudo tail -f /var/log/asterisk/queue_log
sudo tail -f /var/log/asterisk/security.log

# Backend logs (if using pm2)
pm2 logs backend

# Or systemd logs
sudo journalctl -u asterisk -f
sudo journalctl -u keydb -f
```

### Check System Resources

```bash
# CPU and memory usage
htop
# Or
top

# Disk usage
df -h

# Check specific process
ps aux | grep asterisk
ps aux | grep node

# Network connections
sudo netstat -plant | grep ESTABLISHED
```

## Troubleshooting

### Agent Can't Register

1. **Check endpoint configuration**:
   ```bash
   sudo asterisk -rx "pjsip show endpoint 6001"
   ```

2. **Check for errors**:
   ```bash
   sudo tail -f /var/log/asterisk/full | grep 6001
   ```

3. **Enable SIP debugging**:
   ```bash
   sudo asterisk -rx "pjsip set logger on"
   ```

4. **Verify WebSocket**:
   ```bash
   sudo netstat -tlnp | grep 8089
   ```

### No Audio in Calls

1. **Check RTP ports**:
   ```bash
   sudo netstat -ulnp | grep asterisk
   ```

2. **Check firewall**:
   ```bash
   sudo ufw status | grep -E "10000:20000|8089"
   ```

3. **Verify ICE/STUN**:
   ```bash
   sudo asterisk -rx "pjsip show endpoint 6001" | grep ice
   ```

### Backend Not Starting

1. **Check dependencies**:
   ```bash
   npm install
   ```

2. **Check environment**:
   ```bash
   cat apps/backend/.env
   ```

3. **Check ports**:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

4. **Check services**:
   ```bash
   sudo systemctl status orientdb
   sudo systemctl status keydb
   ```

### Database Connection Failed

1. **Check OrientDB**:
   ```bash
   sudo systemctl status orientdb
   curl http://localhost:2480
   ```

2. **Check KeyDB**:
   ```bash
   sudo systemctl status keydb
   keydb-cli ping
   ```

3. **Test connection**:
   ```bash
   telnet localhost 2424
   telnet localhost 6379
   ```

### Queue Not Routing Calls

1. **Check queue configuration**:
   ```bash
   sudo asterisk -rx "queue show support"
   ```

2. **Check agent login**:
   ```bash
   sudo asterisk -rx "queue show support" | grep members
   ```

3. **Manually add agent**:
   ```bash
   sudo asterisk -rx "queue add member PJSIP/6001 to support"
   ```

4. **Check queue logs**:
   ```bash
   sudo tail -f /var/log/asterisk/queue_log
   ```

## Configuration Files

### Main Configuration Files

```bash
# Backend environment
/mnt/c/Users/harri/designProject2020/freePBX-LinPhone/apps/backend/.env

# Asterisk PJSIP
/etc/asterisk/pjsip.conf

# Asterisk HTTP/WebSocket
/etc/asterisk/http.conf

# Asterisk Queues
/etc/asterisk/queues.conf

# Asterisk Dialplan
/etc/asterisk/extensions.conf

# Asterisk ARI
/etc/asterisk/ari.conf

# KeyDB
/etc/keydb/keydb.conf

# OrientDB
/path/to/orientdb/config/orientdb-server-config.xml
```

### Backup Configuration

```bash
# Backup Asterisk config
sudo tar -czf asterisk-config-backup.tar.gz /etc/asterisk/

# Backup OrientDB
sudo tar -czf orientdb-backup.tar.gz /var/lib/orientdb/databases/smart_sip/

# Backup KeyDB
keydb-cli SAVE
cp /var/lib/keydb/dump.rdb keydb-backup.rdb
```

## Security Checklist

- [ ] Change default OrientDB password
- [ ] Set KeyDB password (`requirepass` in config)
- [ ] Enable Asterisk security logging
- [ ] Configure firewall rules
- [ ] Use WSS (not WS) in production
- [ ] Set strong SIP passwords
- [ ] Enable fail2ban for Asterisk
- [ ] Regular backups configured
- [ ] SSL certificates for production
- [ ] Restrict AMI/ARI access

## Performance Tuning

### For High Call Volume

1. **Increase file limits**:
   ```bash
   # /etc/security/limits.conf
   asterisk soft nofile 10000
   asterisk hard nofile 20000
   ```

2. **Optimize KeyDB**:
   ```bash
   # /etc/keydb/keydb.conf
   server-threads 8
   maxclients 10000
   ```

3. **Tune Asterisk**:
   ```bash
   # /etc/asterisk/asterisk.conf
   maxfiles = 10000
   maxload = 5.0
   ```

## Support Resources

### Documentation
- [Full Installation Guide](../INSTALL.md)
- [KeyDB Setup](./keydb-setup.md)
- [Asterisk 21 Configuration](./asterisk21-config.md)
- [API Documentation](./backend-api.md)
- [Smart Routing](./smart-routing.md)

### Useful Links
- [Asterisk Documentation](https://docs.asterisk.org/)
- [KeyDB Documentation](https://docs.keydb.dev/)
- [OrientDB Documentation](https://orientdb.org/docs/)
- [SIP.js Documentation](https://sipjs.com/)

### Common Test Credentials

**Development Agents** (change in production!):
- Extension: 6001, Password: SecurePassword123
- Extension: 6002, Password: SecurePassword456
- Extension: 6003, Password: SecurePassword789

**OrientDB**:
- Username: root
- Password: root_password
- Database: smart_sip

**Asterisk ARI**:
- Username: smart_routing
- Password: StrongARIPassword123

**Asterisk AMI**:
- Username: admin
- Password: StrongAMIPassword456

---

**Last Updated**: 2026
**Platform Version**: 1.0.0

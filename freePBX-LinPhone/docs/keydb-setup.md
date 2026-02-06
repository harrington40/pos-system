# KeyDB Setup Guide

## What is KeyDB?

KeyDB is a high-performance fork of Redis that offers:
- **5x faster** performance than Redis
- **Multi-threading** support
- **Active replication**
- **Full Redis compatibility** - drop-in replacement
- **FLASH storage support**

Perfect for real-time call state management and caching in high-volume call centers.

## Installation

### Ubuntu/Debian

```bash
# Add KeyDB repository
curl -s https://download.keydb.dev/keydb-ppa/KEY.gpg | sudo apt-key add -
echo "deb https://download.keydb.dev/keydb-ppa $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/keydb.list

# Install KeyDB
sudo apt update
sudo apt install keydb
```

### macOS

```bash
# Using Homebrew
brew tap eqalpha/keydb
brew install keydb

# Or build from source
git clone https://github.com/Snapchat/KeyDB.git
cd KeyDB
make
sudo make install
```

### Docker

```bash
# Run KeyDB in Docker
docker run -d --name keydb -p 6379:6379 eqalpha/keydb
```

### From Source

```bash
cd /usr/src
git clone https://github.com/Snapchat/KeyDB.git
cd KeyDB
make
sudo make install
```

## Configuration

### Basic Configuration

Create `/etc/keydb/keydb.conf`:

```conf
# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Performance
server-threads 4
server-thread-affinity true

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/keydb/keydb.log

# Security (optional)
# requirepass your_secure_password_here
```

### Start KeyDB

```bash
# Using systemd
sudo systemctl start keydb
sudo systemctl enable keydb
sudo systemctl status keydb

# Or run directly
keydb-server /etc/keydb/keydb.conf

# Or run in foreground (for testing)
keydb-server
```

## Verification

### Test Connection

```bash
# Using keydb-cli
keydb-cli ping
# Expected: PONG

# Or using redis-cli (KeyDB is compatible)
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

### Check Server Info

```bash
keydb-cli INFO server
```

### Test Basic Operations

```bash
# Set a value
keydb-cli SET test "Hello KeyDB"

# Get a value
keydb-cli GET test
# Expected: "Hello KeyDB"

# Check performance
keydb-cli --latency
```

## Performance Tuning

### For High-Volume Call Centers

```conf
# /etc/keydb/keydb.conf

# Increase server threads (match CPU cores)
server-threads 8

# Enable thread affinity
server-thread-affinity true

# Increase max clients
maxclients 10000

# Optimize TCP backlog
tcp-backlog 511

# Disable slow log for high performance
slowlog-max-len 0

# Use pipelining
tcp-keepalive 300
```

### Memory Optimization

```conf
# Set memory limit
maxmemory 4gb

# Choose eviction policy
# For call state: allkeys-lru (remove least recently used)
# For session cache: volatile-lru (remove expired keys first)
maxmemory-policy allkeys-lru

# Reduce memory overhead
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

### Persistence Tuning

For call centers, balance between performance and data safety:

```conf
# Frequent saves for critical data
save 300 10
save 60 10000

# Or disable persistence for maximum performance
# save ""

# Enable AOF for durability
appendonly yes
appendfsync everysec
```

## Integration with Smart SIP Platform

### Environment Variables

Update `apps/backend/.env`:

```env
# KeyDB Configuration
KEYDB_HOST=localhost
KEYDB_PORT=6379
KEYDB_PASSWORD=
KEYDB_MAX_RETRIES=3
KEYDB_RETRY_DELAY=1000
```

### Connection Pool

KeyDB handles connection pooling automatically, but you can tune:

```typescript
// apps/backend/src/database/redis.service.ts
const client = createClient({
  socket: {
    host: process.env.KEYDB_HOST,
    port: parseInt(process.env.KEYDB_PORT),
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max retries exceeded');
      return Math.min(retries * 100, 3000);
    }
  },
  password: process.env.KEYDB_PASSWORD
});
```

## Monitoring

### Real-Time Monitoring

```bash
# Monitor all commands
keydb-cli MONITOR

# Monitor slow queries
keydb-cli SLOWLOG GET 10

# Get statistics
keydb-cli INFO stats

# Check memory usage
keydb-cli INFO memory
```

### Key Metrics to Watch

```bash
# Connected clients
keydb-cli CLIENT LIST | wc -l

# Operations per second
keydb-cli INFO stats | grep instantaneous_ops_per_sec

# Memory usage
keydb-cli INFO memory | grep used_memory_human

# Hit rate
keydb-cli INFO stats | grep keyspace_hits
keydb-cli INFO stats | grep keyspace_misses
```

### Setup Monitoring Dashboard

```bash
# Install Redis Exporter for Prometheus
docker run -d \
  --name keydb-exporter \
  -p 9121:9121 \
  oliver006/redis_exporter:latest \
  --redis.addr=keydb://localhost:6379
```

## KeyDB vs Redis Comparison

| Feature | KeyDB | Redis |
|---------|-------|-------|
| Performance | 5x faster | Baseline |
| Threading | Multi-threaded | Single-threaded |
| Active Replication | Yes | No |
| FLASH Storage | Yes | No |
| Compatibility | 100% Redis | - |
| License | BSD 3-Clause | BSD 3-Clause |

## Use Cases in Smart SIP Platform

### 1. Call State Caching

```typescript
// Store active call state
await redis.setCallState(callId, {
  from: 'sip:caller@domain.com',
  to: 'sip:6001@pbx.com',
  state: 'active',
  startTime: new Date(),
  agentId: '#25:0'
});

// Retrieve call state
const callState = await redis.getCallState(callId);
```

### 2. Agent Availability

```typescript
// Update agent status
await redis.setAgentState(agentId, {
  status: 'available',
  currentLoad: 1,
  lastUpdate: new Date()
});

// Get all available agents
const agents = await redis.getAllAgentStates();
```

### 3. Queue Management

```typescript
// Add call to queue with priority
await redis.addToQueue(queueId, callId, priority);

// Get queue length
const length = await redis.getQueueLength(queueId);

// Get next call
const calls = await redis.getQueueCalls(queueId);
```

### 4. Session Storage

```typescript
// Store WebSocket session
await redis.set(`session:${socketId}`, JSON.stringify({
  agentId: '#25:0',
  connectedAt: new Date(),
  lastPing: new Date()
}), 3600); // 1 hour TTL
```

## Security

### Enable Authentication

```conf
# /etc/keydb/keydb.conf
requirepass your_strong_password_here
```

Update environment:

```env
KEYDB_PASSWORD=your_strong_password_here
```

### Network Security

```conf
# Bind to specific interface
bind 127.0.0.1

# Or allow specific IPs
bind 127.0.0.1 192.168.1.100
```

### TLS/SSL (Optional)

```conf
# Enable TLS
tls-port 6380
tls-cert-file /path/to/cert.pem
tls-key-file /path/to/key.pem
tls-ca-cert-file /path/to/ca.pem
```

## Backup & Recovery

### Manual Backup

```bash
# Save current state
keydb-cli SAVE

# Copy RDB file
cp /var/lib/keydb/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# Or use BGSAVE for background save
keydb-cli BGSAVE
```

### Automated Backup

```bash
#!/bin/bash
# /usr/local/bin/keydb-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/keydb"

# Trigger background save
keydb-cli BGSAVE

# Wait for save to complete
sleep 5

# Copy RDB file
cp /var/lib/keydb/dump.rdb $BACKUP_DIR/dump-$DATE.rdb

# Compress
gzip $BACKUP_DIR/dump-$DATE.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "dump-*.rdb.gz" -mtime +7 -delete
```

Add to crontab:

```bash
# Backup every 6 hours
0 */6 * * * /usr/local/bin/keydb-backup.sh
```

### Recovery

```bash
# Stop KeyDB
sudo systemctl stop keydb

# Restore RDB file
gunzip -c /backup/keydb/dump-20260205.rdb.gz > /var/lib/keydb/dump.rdb

# Set ownership
sudo chown keydb:keydb /var/lib/keydb/dump.rdb

# Start KeyDB
sudo systemctl start keydb
```

## Troubleshooting

### Connection Refused

```bash
# Check if KeyDB is running
sudo systemctl status keydb

# Check port
sudo netstat -tlnp | grep 6379

# Test connection
telnet localhost 6379
```

### High Memory Usage

```bash
# Check memory
keydb-cli INFO memory

# Find large keys
keydb-cli --bigkeys

# Flush if needed (CAUTION: deletes all data)
keydb-cli FLUSHALL
```

### Performance Issues

```bash
# Check slow queries
keydb-cli SLOWLOG GET 10

# Monitor latency
keydb-cli --latency

# Check configuration
keydb-cli CONFIG GET "*"
```

## Migration from Redis

KeyDB is 100% compatible with Redis. Simply:

1. **Install KeyDB** using instructions above
2. **Stop Redis**: `sudo systemctl stop redis`
3. **Copy data**: `cp /var/lib/redis/dump.rdb /var/lib/keydb/`
4. **Update config**: Point to KeyDB port
5. **Start KeyDB**: `sudo systemctl start keydb`

No code changes required! The Smart SIP Platform will automatically connect to KeyDB.

## References

- [KeyDB Documentation](https://docs.keydb.dev)
- [KeyDB GitHub](https://github.com/Snapchat/KeyDB)
- [Performance Benchmarks](https://docs.keydb.dev/docs/benchmarking/)
- [Redis to KeyDB Migration](https://docs.keydb.dev/docs/migration/)

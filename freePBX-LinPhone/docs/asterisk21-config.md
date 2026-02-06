# Asterisk 21 Configuration Guide

## Installation Path

Your Asterisk 21 installation is located at:
```
/usr/src/asterisk-21
```

## Configuration Files Location

```bash
# Main configuration directory
/etc/asterisk/

# Key configuration files for SIP platform
/etc/asterisk/pjsip.conf          # PJSIP endpoint configuration
/etc/asterisk/pjsip_wizard.conf   # PJSIP wizard templates
/etc/asterisk/http.conf           # HTTP/WebSocket server
/etc/asterisk/extensions.conf     # Dialplan
/etc/asterisk/ari.conf            # Asterisk REST Interface
/etc/asterisk/stasis.conf         # Stasis application
```

## WebSocket Configuration

### 1. Enable HTTP Server

Edit `/etc/asterisk/http.conf`:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

; Enable TLS/SSL for secure WebSocket (WSS)
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.crt
tlsprivatekey=/etc/asterisk/keys/asterisk.key

; Enable WebSocket
enablestatic=yes
```

### 2. Generate SSL Certificates (for WSS)

```bash
# Create keys directory
sudo mkdir -p /etc/asterisk/keys

# Generate self-signed certificate (for development)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/asterisk/keys/asterisk.key \
  -out /etc/asterisk/keys/asterisk.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=pbx.yourdomain.com"

# Set permissions
sudo chown asterisk:asterisk /etc/asterisk/keys/*
sudo chmod 600 /etc/asterisk/keys/*.key
```

For production, use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d pbx.yourdomain.com

# Link certificates
sudo ln -s /etc/letsencrypt/live/pbx.yourdomain.com/fullchain.pem /etc/asterisk/keys/asterisk.crt
sudo ln -s /etc/letsencrypt/live/pbx.yourdomain.com/privkey.pem /etc/asterisk/keys/asterisk.key
```

### 3. Configure PJSIP for WebSocket

Edit `/etc/asterisk/pjsip.conf`:

```ini
;=========================================
; Transport Configuration
;=========================================

; UDP Transport (traditional SIP)
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; TCP Transport
[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060

; WebSocket Transport (WS)
[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088

; Secure WebSocket Transport (WSS)
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

;=========================================
; Global Settings
;=========================================

[global]
max_forwards=70
user_agent=Asterisk PBX 21
default_realm=yourdomain.com

;=========================================
; Template for WebRTC Endpoints
;=========================================

[endpoint-webrtc](!)
type=endpoint
transport=transport-wss
context=default
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
use_avpf=yes
media_encryption=dtls
dtls_auto_generate_cert=yes
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
media_use_received_transport=yes
rtcp_mux=yes
bundle=yes
dtmf_mode=rfc4733
direct_media=no
trust_id_inbound=yes
send_pai=yes
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes

;=========================================
; AOR Template
;=========================================

[aor-webrtc](!)
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=30

;=========================================
; Authentication Template
;=========================================

[auth-webrtc](!)
type=auth
auth_type=userpass

;=========================================
; Agent Endpoints
;=========================================

; Agent 6001
[6001](endpoint-webrtc)
auth=6001-auth
aors=6001

[6001-auth](auth-webrtc)
password=SecurePassword123
username=6001

[6001](aor-webrtc)

; Agent 6002
[6002](endpoint-webrtc)
auth=6002-auth
aors=6002

[6002-auth](auth-webrtc)
password=SecurePassword456
username=6002

[6002](aor-webrtc)

; Agent 6003
[6003](endpoint-webrtc)
auth=6003-auth
aors=6003

[6003-auth](auth-webrtc)
password=SecurePassword789
username=6003

[6003](aor-webrtc)

;=========================================
; Trunk Configuration (if needed)
;=========================================

[trunk-provider]
type=endpoint
transport=transport-udp
context=from-external
disallow=all
allow=ulaw,alaw
direct_media=no
from_domain=sip.provider.com
aors=trunk-provider

[trunk-provider]
type=aor
contact=sip:sip.provider.com

[trunk-provider]
type=identify
endpoint=trunk-provider
match=203.0.113.1
```

## Dialplan Configuration

Edit `/etc/asterisk/extensions.conf`:

```ini
[general]
static=yes
writeprotect=no
clearglobalvars=no

[globals]
; Global variables
TRUNK=trunk-provider

[default]
; Default context for agent endpoints

; Echo test
exten => 600,1,NoOp(Echo Test)
 same => n,Answer()
 same => n,Wait(1)
 same => n,Playback(demo-echotest)
 same => n,Echo()
 same => n,Hangup()

; Voicemail access
exten => *97,1,NoOp(Voicemail)
 same => n,Answer()
 same => n,VoiceMailMain(${CALLERID(num)})
 same => n,Hangup()

; Agent to agent calls
exten => _6XXX,1,NoOp(Internal Call to ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN},30)
 same => n,GotoIf($["${DIALSTATUS}" = "BUSY"]?busy:unavail)
 same => n(unavail),VoiceMail(${EXTEN}@default,u)
 same => n,Hangup()
 same => n(busy),VoiceMail(${EXTEN}@default,b)
 same => n,Hangup()

; Queue entry point (called by Smart Routing)
exten => _7XXX,1,NoOp(Queue Call)
 same => n,Set(QUEUE_NAME=${EXTEN:1})
 same => n,Queue(${QUEUE_NAME},t,,,300)
 same => n,Hangup()

; External outbound (via trunk)
exten => _X.,1,NoOp(Outbound Call to ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN}@${TRUNK},30)
 same => n,Hangup()

; Emergency
exten => 911,1,NoOp(Emergency Call)
 same => n,Dial(PJSIP/911@${TRUNK})
 same => n,Hangup()

[from-external]
; Context for inbound calls from trunk

; Route to queue manager
exten => _X.,1,NoOp(Inbound Call from ${CALLERID(num)})
 same => n,Set(CALLERID(name)=External)
 same => n,Answer()
 same => n,Playback(welcome)
 same => n,Queue(support,t,,,300)
 same => n,VoiceMail(100@default,u)
 same => n,Hangup()
```

## Queue Configuration

Edit `/etc/asterisk/queues.conf`:

```ini
[general]
persistentmembers = yes
autofill = yes
monitor-type = MixMonitor
shared_lastcall = yes

;=========================================
; Queue Templates
;=========================================

[support]
strategy = rrmemory               ; Round robin with memory
timeout = 30                       ; Ring agent for 30 seconds
retry = 5                          ; Wait 5 seconds before trying next
maxlen = 50                        ; Max calls in queue
announce-frequency = 60            ; Announce position every 60 seconds
announce-holdtime = yes
announce-position = yes
periodic-announce-frequency = 30   ; Play message every 30 seconds
periodic-announce = queue-periodic-announce
musicclass = default
context = default
autopause = yes                    ; Auto-pause agent on no answer
autopausedelay = 5                 ; Delay before auto-pause
wrapuptime = 15                    ; 15 seconds after call ends
ringinuse = no                     ; Don't ring agents on calls
setinterfacevar = yes
setqueueentryvar = yes
setqueuevar = yes

[sales]
strategy = fewestcalls             ; Route to agent with fewest calls
timeout = 30
retry = 5
maxlen = 50
musicclass = default
context = default
autopause = yes
wrapuptime = 20                    ; 20 seconds for sales notes
ringinuse = no

[technical]
strategy = leastrecent             ; Route to least recently called agent
timeout = 45                       ; Technical calls may need more time
retry = 5
maxlen = 30
musicclass = default
context = default
autopause = yes
wrapuptime = 30                    ; 30 seconds for ticket creation
ringinuse = no
```

## ARI Configuration (for Smart Routing Integration)

Edit `/etc/asterisk/ari.conf`:

```ini
[general]
enabled = yes
pretty = yes
allowed_origins = http://localhost:3000,https://yourdomain.com

[smart_routing]
type = user
read_only = no
password = StrongARIPassword123
password_format = plain
```

Edit `/etc/asterisk/stasis.conf`:

```ini
[smart_routing]
type=application
```

## Manager Interface (AMI) Configuration

Edit `/etc/asterisk/manager.conf`:

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
port = 5038
webenabled = yes

[admin]
secret = StrongAMIPassword456
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.0.0.0
permit = 192.168.1.0/255.255.255.0
read = all
write = all
```

## Restart Asterisk

```bash
# Check configuration for errors
sudo asterisk -rx "core reload"

# Or full restart
sudo systemctl restart asterisk

# Verify status
sudo systemctl status asterisk
```

## Verify Configuration

### 1. Check Listening Ports

```bash
# Check WebSocket ports
sudo netstat -tlnp | grep asterisk
# Should show: 8088 (WS), 8089 (WSS), 5060 (SIP)

# Or with ss
sudo ss -tlnp | grep asterisk
```

### 2. Test from Asterisk CLI

```bash
# Connect to Asterisk CLI
sudo asterisk -rvvv

# Check PJSIP transports
pjsip show transports

# Expected output:
# Transport:  <TransportId>........  <Type>  <cos>  <tos>  <BindAddress>
# transport-ws                       ws      0      0      0.0.0.0:8088
# transport-wss                      wss     0      0      0.0.0.0:8089

# Check PJSIP endpoints
pjsip show endpoints

# Monitor registrations
pjsip show aors

# Watch for registration attempts
pjsip set logger on
```

### 3. Test WebSocket Connection

```javascript
// From browser console or Node.js
const ws = new WebSocket('wss://yourdomain.com:8089');
ws.onopen = () => console.log('Connected to Asterisk WebSocket');
ws.onerror = (err) => console.error('WebSocket error:', err);
```

## Integration with Smart SIP Platform

### Update Backend Configuration

Edit `apps/backend/.env`:

```env
# Asterisk Configuration
ASTERISK_PATH=/usr/src/asterisk-21
ASTERISK_HOST=localhost
ASTERISK_WS_URL=ws://localhost:8088/ws
ASTERISK_WSS_URL=wss://yourdomain.com:8089/ws
ASTERISK_ARI_URL=http://localhost:8088/ari
ASTERISK_ARI_USER=smart_routing
ASTERISK_ARI_PASSWORD=StrongARIPassword123
ASTERISK_AMI_HOST=localhost
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=admin
ASTERISK_AMI_PASSWORD=StrongAMIPassword456
```

### SIP Client Configuration

Edit `apps/web/src/config/sip.ts` (or equivalent):

```typescript
export const SIP_CONFIG = {
  uri: 'sip:6001@yourdomain.com',
  transportOptions: {
    wsServers: ['wss://yourdomain.com:8089/ws'],
    connectionTimeout: 5
  },
  authorizationUsername: '6001',
  authorizationPassword: 'SecurePassword123',
  sessionDescriptionHandlerFactoryOptions: {
    constraints: {
      audio: true,
      video: false
    },
    peerConnectionOptions: {
      rtcConfiguration: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    }
  },
  contactName: 'Agent 6001',
  displayName: 'Agent 6001',
  userAgentString: 'Smart SIP Platform v1.0'
};
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow SIP, WebSocket, and ARI ports
sudo ufw allow 5060/udp comment 'Asterisk SIP'
sudo ufw allow 5060/tcp comment 'Asterisk SIP TCP'
sudo ufw allow 8088/tcp comment 'Asterisk WebSocket'
sudo ufw allow 8089/tcp comment 'Asterisk WSS'

# RTP ports for media
sudo ufw allow 10000:20000/udp comment 'Asterisk RTP'

# AMI (restrict to localhost only)
# sudo ufw allow from 127.0.0.1 to any port 5038
```

### 2. Fail2ban Configuration

Create `/etc/fail2ban/filter.d/asterisk-security.conf`:

```ini
[Definition]
failregex = ^%(__prefix_line)sCHAN_START/res_security_log\.c: SecurityEvent="InvalidPassword".*RemoteAddress="IPV[46]/[^/]+/<HOST>/[0-9]+".*$
ignoreregex =
```

Create `/etc/fail2ban/jail.d/asterisk.conf`:

```ini
[asterisk-security]
enabled = true
filter = asterisk-security
action = iptables-allports[name=ASTERISK]
logpath = /var/log/asterisk/security.log
maxretry = 3
bantime = 86400
findtime = 600
```

Enable logging in `/etc/asterisk/logger.conf`:

```ini
[general]
[logfiles]
security.log => security
```

Restart services:

```bash
sudo fail2ban-client reload
sudo asterisk -rx "logger reload"
```

## Monitoring & Debugging

### Real-Time Monitoring

```bash
# Connect to CLI with verbose output
sudo asterisk -rvvvvv

# Monitor PJSIP activity
pjsip set logger on

# Monitor all calls
core set verbose 5

# Watch SIP messages
pjsip set logger verbose on
```

### Useful CLI Commands

```bash
# Show active channels
core show channels

# Show active calls
core show calls

# Show queue statistics
queue show

# Show specific queue
queue show support

# Add agent to queue
queue add member PJSIP/6001 to support

# Remove agent from queue
queue remove member PJSIP/6001 from support

# Pause/unpause agent
queue pause member PJSIP/6001 queue support reason "Break"
queue unpause member PJSIP/6001 queue support

# Show PJSIP endpoint details
pjsip show endpoint 6001

# Show registration status
pjsip show aor 6001

# Check WebSocket connections
core show channels like ws
```

### Log Files

```bash
# Main logs
tail -f /var/log/asterisk/full

# Security logs
tail -f /var/log/asterisk/security.log

# Queue logs
tail -f /var/log/asterisk/queue_log

# CDR (Call Detail Records)
tail -f /var/log/asterisk/cdr-csv/Master.csv
```

## Troubleshooting

### WebSocket Connection Fails

```bash
# Check if HTTP server is running
asterisk -rx "http show status"

# Check transports
asterisk -rx "pjsip show transports"

# Check for errors
grep -i "websocket\|ws\|wss" /var/log/asterisk/full

# Test SSL certificate
openssl s_client -connect yourdomain.com:8089
```

### Agent Can't Register

```bash
# Check endpoint configuration
asterisk -rx "pjsip show endpoint 6001"

# Check authentication
asterisk -rx "pjsip show auth 6001-auth"

# Monitor registration attempts
asterisk -rx "pjsip set logger on"
# Then try to register and watch the output

# Check for NAT issues
asterisk -rx "pjsip show endpoint 6001" | grep contact
```

### No Audio in Calls

```bash
# Check RTP ports
sudo netstat -ulnp | grep asterisk

# Check firewall
sudo ufw status | grep -E "8088|8089|10000:20000"

# Verify STUN server
dig stun.l.google.com

# Check ICE and DTLS
asterisk -rx "pjsip show endpoint 6001" | grep -E "ice|dtls|webrtc"
```

### Queue Not Working

```bash
# Check queue configuration
asterisk -rx "queue show support"

# Check if agents are logged in
asterisk -rx "queue show support" | grep members

# Check queue logs
tail -f /var/log/asterisk/queue_log

# Manually add agent
asterisk -rx "queue add member PJSIP/6001 to support"
```

## Performance Tuning

### For High Call Volume

Edit `/etc/asterisk/asterisk.conf`:

```ini
[options]
maxfiles = 10000
maxload = 5.0
minmemfree = 256

[compat]
res_agi_old_result = no
```

Edit `/etc/security/limits.conf`:

```
asterisk soft nofile 10000
asterisk hard nofile 20000
asterisk soft nproc 4096
asterisk hard nproc 8192
```

### Optimize RTP

Edit `/etc/asterisk/rtp.conf`:

```ini
[general]
rtpstart=10000
rtpend=20000
rtpchecksums=no
strictrtp=yes
icesupport=yes
stunaddr=stun.l.google.com
```

## Backup Configuration

```bash
#!/bin/bash
# /usr/local/bin/asterisk-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/asterisk"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/asterisk-config-$DATE.tar.gz /etc/asterisk/

# Backup CDR database (if using MySQL)
# mysqldump -u root -p asterisk_cdr > $BACKUP_DIR/cdr-$DATE.sql

# Backup voicemail
tar -czf $BACKUP_DIR/voicemail-$DATE.tar.gz /var/spool/asterisk/voicemail/

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/asterisk-backup.sh
```

## References

- [Asterisk 21 Documentation](https://docs.asterisk.org/Asterisk_21_Documentation/)
- [PJSIP Configuration](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/)
- [WebRTC Tutorial](https://docs.asterisk.org/Configuration/WebRTC/)
- [ARI Documentation](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-REST-Interface-ARI/)
- [Queue Configuration](https://docs.asterisk.org/Configuration/Applications/Queue-Applications/)

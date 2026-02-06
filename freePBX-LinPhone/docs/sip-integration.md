# SIP Integration Guide

## Overview

The Smart SIP Platform uses SIP.js for SIP protocol handling and WebRTC for media streaming, supporting both browser-based and native clients.

## Architecture

```
┌─────────────┐       WSS        ┌──────────┐       SIP/UDP       ┌─────────┐
│  Web/Mobile │ ←─────────────→  │ Asterisk │ ←─────────────────→ │  PSTN   │
│   Client    │   SIP over WS    │   PBX    │   Traditional SIP   │ Gateway │
└─────────────┘                  └──────────┘                     └─────────┘
```

## Prerequisites

### Asterisk 21 Configuration

Asterisk 21 is installed at `/usr/src/asterisk-21`

1. **Enable HTTP/WebSocket support**

Edit `/etc/asterisk/http.conf`:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

; For secure WebSocket (recommended)
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

2. **Configure PJSIP transport**

Edit `/etc/asterisk/pjsip.conf`:

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
```

3. **Create WebRTC endpoints**

```ini
; Template for WebRTC endpoints
[webrtc-endpoint](!)
type=endpoint
transport=transport-wss
context=default
disallow=all
allow=opus
allow=ulaw
allow=alaw
webrtc=yes
dtls_auto_generate_cert=yes
use_avpf=yes
media_encryption=dtls
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
rtcp_mux=yes

; Specific endpoint
[6001](webrtc-endpoint)
auth=6001
aors=6001

[6001]
type=auth
auth_type=userpass
password=secure_password_here
username=6001

[6001]
type=aor
max_contacts=5
qualify_frequency=30
```

4. **Restart Asterisk**

```bash
# Check if Asterisk is running
sudo asterisk -rx "core show version"

# Restart Asterisk 21
sudo systemctl restart asterisk

# Or if running manually from /usr/src/asterisk-21
cd /usr/src/asterisk-21
sudo ./asterisk -rx "core restart now"
```

### SSL Certificates

For production, use Let's Encrypt certificates:

```bash
# Get certificates
sudo certbot certonly --standalone -d pbx.yourdomain.com

# Copy to Asterisk
sudo cp /etc/letsencrypt/live/pbx.yourdomain.com/fullchain.pem /etc/asterisk/keys/asterisk.pem
sudo cp /etc/letsencrypt/live/pbx.yourdomain.com/privkey.pem /etc/asterisk/keys/asterisk.key
sudo chown asterisk:asterisk /etc/asterisk/keys/*
```

## Client Setup

### Web Client (React)

```typescript
import { SIPClient } from '@smart-sip/sip-core';

// Initialize SIP client
const sipClient = new SIPClient({
  uri: 'sip:6001@pbx.yourdomain.com',
  wsServer: 'wss://pbx.yourdomain.com:8089/ws',
  authUsername: '6001',
  authPassword: 'secure_password_here',
  displayName: 'John Doe',
  userAgentString: 'SmartSIP-Web/1.0',
  registerExpires: 600,
  sessionDescriptionHandlerFactoryOptions: {
    constraints: {
      audio: true,
      video: false
    },
    peerConnectionOptions: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }
});

// Connect and register
await sipClient.connect();

// Event handlers
sipClient.on('connected', () => {
  console.log('SIP connected');
});

sipClient.on('registered', () => {
  console.log('SIP registered');
});

sipClient.on('incomingCall', async (data) => {
  console.log('Incoming call from:', data.from);
  
  // Auto-answer or show UI
  await sipClient.answer(data.sessionId);
});

// Make a call
const sessionId = await sipClient.call('sip:6002@pbx.yourdomain.com');
```

### React Native Client

For React Native, additional setup is required:

```bash
npm install react-native-webrtc
```

**iOS Setup (Podfile):**

```ruby
target 'YourApp' do
  # ...
  pod 'react-native-webrtc', :path => '../node_modules/react-native-webrtc'
end
```

**Android Setup (AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Call Flows

### Outbound Call

```typescript
// 1. Make call
const sessionId = await sipClient.call('sip:5551234567@provider.com');

// 2. Wait for call established
sipClient.on('callEstablished', ({ sessionId }) => {
  console.log('Call connected');
});

// 3. Hang up
await sipClient.hangup(sessionId);
```

### Inbound Call

```typescript
// 1. Listen for incoming calls
sipClient.on('incomingCall', async (data) => {
  const { sessionId, from, displayName } = data;
  
  // 2. Show UI to accept/reject
  showIncomingCallUI(from, displayName);
  
  // 3. Answer
  await sipClient.answer(sessionId);
  
  // Or decline
  // await sipClient.decline(sessionId);
});
```

### Hold/Resume

```typescript
// Put call on hold
await sipClient.hold(sessionId);

// Resume call
await sipClient.unhold(sessionId);
```

### Mute/Unmute

```typescript
// Mute microphone
sipClient.mute(sessionId);

// Unmute
sipClient.unmute(sessionId);
```

### Transfer

```typescript
// Blind transfer
await sipClient.transfer(sessionId, 'sip:6002@pbx.yourdomain.com');

// Attended transfer (future enhancement)
// const newSessionId = await sipClient.call('sip:6002@pbx.yourdomain.com');
// await sipClient.transferAttended(originalSessionId, newSessionId);
```

### DTMF

```typescript
// Send DTMF tones
sipClient.sendDTMF(sessionId, '1');  // Send '1'
sipClient.sendDTMF(sessionId, '#');  // Send '#'
```

## Advanced Features

### Audio Devices

```typescript
// Get available audio devices
const devices = await navigator.mediaDevices.enumerateDevices();
const audioDevices = devices.filter(d => d.kind === 'audioinput');

// Select specific device
const constraints = {
  audio: {
    deviceId: audioDevices[0].deviceId
  },
  video: false
};
```

### Call Recording

Asterisk automatically records calls if configured:

```ini
; /etc/asterisk/extensions.conf
[default]
exten => _X.,1,MixMonitor(/var/spool/asterisk/monitor/${UNIQUEID}.wav)
same => n,Dial(PJSIP/${EXTEN})
```

### Call Quality Monitoring

```typescript
sipClient.on('callEstablished', ({ sessionId }) => {
  const session = sipClient.getSession(sessionId);
  const pc = session.session.sessionDescriptionHandler?.peerConnection;
  
  // Get RTC stats
  setInterval(async () => {
    const stats = await pc.getStats();
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        console.log('Packets lost:', report.packetsLost);
        console.log('Jitter:', report.jitter);
      }
    });
  }, 5000);
});
```

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to WebSocket

**Solutions:**
1. Check Asterisk is running: `sudo systemctl status asterisk`
2. Verify WebSocket port is open: `telnet pbx.yourdomain.com 8089`
3. Check firewall rules: `sudo ufw status`
4. Review Asterisk logs: `tail -f /var/log/asterisk/full`
5. Check Asterisk 21 installation: `ls -la /usr/src/asterisk-21`

### Registration Failures

**Problem:** SIP registration fails

**Solutions:**
1. Verify credentials in Asterisk:
   ```bash
   sudo asterisk -rx "pjsip show endpoint 6001"
   ```
2. Check auth configuration
3. Review PJSIP logs:
   ```bash
   sudo asterisk -rx "pjsip set logger on"
   ```

### No Audio

**Problem:** Call connects but no audio

**Solutions:**
1. Check ICE servers configuration
2. Verify STUN/TURN servers are reachable
3. Check firewall allows UDP ports 10000-20000
4. Enable RTCP:
   ```typescript
   peerConnectionOptions: {
     iceServers: [...],
     rtcpMuxPolicy: 'require'
   }
   ```

### Echo/Feedback

**Problem:** Hearing echo on calls

**Solutions:**
1. Enable echo cancellation:
   ```typescript
   constraints: {
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true
     }
   }
   ```
2. Check Asterisk echo cancellation:
   ```ini
   [general]
   echocancel=yes
   echocancelwhenbridged=yes
   ```

### One-Way Audio

**Problem:** Can hear other party, but they can't hear you

**Solutions:**
1. Check microphone permissions
2. Verify NAT configuration
3. Test with different STUN servers
4. Check symmetric RTP in Asterisk:
   ```ini
   [general]
   symmetric_transport=yes
   ```

## Security Best Practices

1. **Always use WSS** (WebSocket Secure)
2. **Use strong passwords** for SIP accounts
3. **Implement rate limiting** on registration attempts
4. **Enable fail2ban** for Asterisk
5. **Restrict allowed codecs** to save bandwidth
6. **Use ACLs** to limit registration IPs
7. **Enable SRTP** for encrypted media

Example ACL in `pjsip.conf`:

```ini
[6001]
type=endpoint
; ...
acl=internal_network

[internal_network]
type=acl
deny=0.0.0.0/0
permit=192.168.1.0/24
permit=10.0.0.0/8
```

## Performance Optimization

1. **Use Opus codec** for better quality and bandwidth efficiency
2. **Enable jitter buffer**:
   ```ini
   [global]
   jbenable=yes
   jbmaxsize=200
   ```
3. **Tune RTP timeouts**:
   ```ini
   [global]
   rtptimeout=60
   rtpholdtimeout=300
   ```
4. **Use dedicated STUN/TURN servers**
5. **Implement connection pooling** for WebSocket connections

## Testing

### Manual Testing

Use SIP testing tools:
- **sipML5**: Web-based SIP client
- **Linphone**: Desktop/mobile client
- **Bria**: Professional SIP client

### Automated Testing

```typescript
// Example test
describe('SIP Client', () => {
  it('should connect and register', async () => {
    const client = new SIPClient(config);
    await client.connect();
    
    expect(client.isConnected()).toBe(true);
  });
  
  it('should make outbound call', async () => {
    const sessionId = await client.call('sip:test@example.com');
    
    expect(sessionId).toBeDefined();
  });
});
```

## Reference

- [SIP.js Documentation](https://sipjs.com/guides/)
- [Asterisk WebRTC Guide](https://wiki.asterisk.org/wiki/display/AST/WebRTC+tutorial+using+SIPML5)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [RFC 3261 - SIP Protocol](https://tools.ietf.org/html/rfc3261)

# Backend API Reference

## Base URL

```
http://localhost:3000/api
```

## Technology Stack

- **NestJS** - API framework
- **OrientDB** - Graph database for entities and relationships
- **KeyDB** - High-performance Redis fork for caching and real-time state
- **WebSocket** - Real-time event communication
- **Asterisk 21** - PBX core (installed at /usr/src/asterisk-21)

## Authentication

Currently, the API does not require authentication for development.  
**⚠️ Implement JWT authentication before production deployment.**

---

## Agents

### Create Agent

```http
POST /api/agents
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "sipExtension": "6001",
  "maxConcurrentCalls": 2,
  "skills": [
    {
      "name": "Technical Support",
      "category": "support",
      "level": 8
    },
    {
      "name": "Sales",
      "category": "sales",
      "level": 6
    }
  ]
}
```

**Response:**
```json
{
  "id": "#25:0",
  "name": "John Doe",
  "email": "john@example.com",
  "sipExtension": "6001",
  "status": "offline",
  "skills": [...],
  "currentLoad": 0,
  "maxConcurrentCalls": 2,
  "totalCalls": 0,
  "averageHandleTime": 0,
  "availability": 1.0
}
```

### Get All Agents

```http
GET /api/agents
```

### Get Available Agents

```http
GET /api/agents/available
```

### Get Agent by ID

```http
GET /api/agents/:id
```

### Update Agent Status

```http
PUT /api/agents/:id/status
Content-Type: application/json

{
  "status": "available"
}
```

**Status values:** `available`, `busy`, `on_break`, `offline`, `in_call`

### Add Skill to Agent

```http
POST /api/agents/:id/skills
Content-Type: application/json

{
  "name": "Billing",
  "category": "support",
  "level": 7
}
```

---

## Calls

### Create Call

```http
POST /api/calls
Content-Type: application/json

{
  "from": "sip:caller@domain.com",
  "to": "sip:6001@localhost",
  "direction": "inbound",
  "priority": 1,
  "metadata": {
    "customerId": "12345",
    "reason": "support"
  }
}
```

### Get All Calls

```http
GET /api/calls
```

### Get Active Calls Only

```http
GET /api/calls?active=true
```

### Get Call by ID

```http
GET /api/calls/:id
```

### Update Call State

```http
PUT /api/calls/:id/state
Content-Type: application/json

{
  "state": "active"
}
```

**State values:** `idle`, `ringing`, `connecting`, `active`, `hold`, `transferring`, `ended`, `failed`

### Assign Call to Agent

```http
POST /api/calls/:id/assign
Content-Type: application/json

{
  "agentId": "#25:0"
}
```

### Delete Call

```http
DELETE /api/calls/:id
```

---

## Queues

### Create Queue

```http
POST /api/queues
Content-Type: application/json

{
  "name": "Support Queue",
  "extension": "5000",
  "priority": 1,
  "maxWaitTime": 300,
  "strategy": "skill_based",
  "requiredSkills": [
    {
      "name": "Technical Support",
      "category": "support",
      "level": 5
    }
  ]
}
```

**Strategy values:** `round_robin`, `least_busy`, `skill_based`, `priority`, `ai_powered`

### Get All Queues

```http
GET /api/queues
```

### Get Queue by ID

```http
GET /api/queues/:id
```

### Get Queue Statistics

```http
GET /api/queues/:id/stats
```

**Response:**
```json
{
  "queueId": "#26:0",
  "queueName": "Support Queue",
  "waitingCalls": 3,
  "availableAgents": 5,
  "longestWaitTime": 120,
  "averageWaitTime": 45,
  "maxWaitTime": 300
}
```

### Add Call to Queue

```http
POST /api/queues/:id/calls
Content-Type: application/json

{
  "callId": "call_abc123",
  "priority": 5
}
```

### Add Agents to Queue

```http
POST /api/queues/:id/agents
Content-Type: application/json

{
  "agentIds": ["#25:0", "#25:1", "#25:2"]
}
```

---

## Routing

### Find Best Agent

```http
POST /api/routing/find-agent
Content-Type: application/json

{
  "requiredSkills": [
    {
      "name": "Technical Support",
      "category": "support",
      "level": 5
    }
  ],
  "priority": 1
}
```

**Response:**
```json
{
  "id": "#25:0",
  "name": "John Doe",
  "sipExtension": "6001",
  ...
}
```

### Get Routing Scores

Calculate scores for all available agents:

```http
POST /api/routing/scores
Content-Type: application/json

{
  "requiredSkills": [...],
  "priority": 5
}
```

**Response:**
```json
[
  {
    "agentId": "#25:0",
    "score": 0.85,
    "breakdown": {
      "availability": 0.9,
      "skillMatch": 0.8,
      "loadBalance": 1.0,
      "priority": 0.5
    }
  },
  ...
]
```

### Skill-Based Routing

```http
POST /api/routing/skill-based
Content-Type: application/json

{
  "requiredSkills": [...],
  "allowPartialMatch": true
}
```

### Priority Routing

For high-priority or VIP calls:

```http
POST /api/routing/priority
Content-Type: application/json

{
  "priority": 10,
  "requiredSkills": [...]
}
```

### Get Routing Weights

```http
GET /api/routing/weights
```

**Response:**
```json
{
  "availability": 0.4,
  "skillMatch": 0.3,
  "loadBalance": 0.2,
  "priority": 0.1
}
```

### Update Routing Weights

```http
POST /api/routing/weights
Content-Type: application/json

{
  "availability": 0.5,
  "skillMatch": 0.3,
  "loadBalance": 0.15,
  "priority": 0.05
}
```

---

## WebSocket Events

Connect to WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
```

### Client → Server Events

#### Register Agent

```javascript
socket.emit('register', {
  agentId: '#25:0',
  type: 'agent' // or 'supervisor'
});
```

#### Update Agent Status

```javascript
socket.emit('agent_status_update', {
  agentId: '#25:0',
  status: 'available'
});
```

#### Update Call State

```javascript
socket.emit('call_update', {
  callId: 'call_abc123',
  state: 'active'
});
```

### Server → Client Events

#### Incoming Call

```javascript
socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
  // { callId, from, displayName, timestamp }
});
```

#### Call Answered

```javascript
socket.on('call:answered', (data) => {
  console.log('Call answered:', data);
  // { callId, agentId, timestamp }
});
```

#### Call Ended

```javascript
socket.on('call:ended', (data) => {
  console.log('Call ended:', data);
  // { callId, timestamp }
});
```

#### Agent Status Changed

```javascript
socket.on('agent_status', (data) => {
  console.log('Agent status:', data);
  // { agentId, status, timestamp }
});
```

#### Queue Update

```javascript
socket.on('queue_update', (data) => {
  console.log('Queue update:', data);
  // { queueId, stats, timestamp }
});
```

#### System Notification

```javascript
socket.on('system_notification', (data) => {
  console.log('Notification:', data);
  // { message, type, timestamp }
});
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently not implemented.  
**⚠️ Add rate limiting before production deployment.**

---

## Examples

See the [examples](./examples/) directory for complete integration examples:
- Node.js client
- Python client
- Webhook integrations

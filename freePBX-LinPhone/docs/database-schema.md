# OrientDB Database Schema

## Overview

The Smart SIP Platform uses OrientDB's graph database features to model relationships between entities like agents, calls, queues, and skills.

## Vertex Classes

### Agent

Represents a call center agent.

**Properties:**
```sql
CREATE PROPERTY Agent.name STRING (MANDATORY TRUE)
CREATE PROPERTY Agent.email STRING (MANDATORY TRUE)
CREATE PROPERTY Agent.sipExtension STRING (MANDATORY TRUE)
CREATE PROPERTY Agent.status STRING (MANDATORY TRUE)
CREATE PROPERTY Agent.currentLoad INTEGER
CREATE PROPERTY Agent.maxConcurrentCalls INTEGER
CREATE PROPERTY Agent.totalCalls INTEGER
CREATE PROPERTY Agent.averageHandleTime DOUBLE
CREATE PROPERTY Agent.availability DOUBLE
CREATE PROPERTY Agent.metadata EMBEDDEDMAP
CREATE PROPERTY Agent.createdAt DATETIME
```

**Indexes:**
```sql
CREATE INDEX Agent.email UNIQUE
CREATE INDEX Agent.sipExtension UNIQUE
CREATE INDEX Agent.status NOTUNIQUE
```

**Example:**
```json
{
  "@class": "Agent",
  "name": "John Doe",
  "email": "john@example.com",
  "sipExtension": "6001",
  "status": "available",
  "currentLoad": 1,
  "maxConcurrentCalls": 2,
  "totalCalls": 150,
  "averageHandleTime": 180.5,
  "availability": 0.95
}
```

### Call

Represents a phone call.

**Properties:**
```sql
CREATE PROPERTY Call.id STRING (MANDATORY TRUE)
CREATE PROPERTY Call.from STRING (MANDATORY TRUE)
CREATE PROPERTY Call.to STRING (MANDATORY TRUE)
CREATE PROPERTY Call.direction STRING (MANDATORY TRUE)
CREATE PROPERTY Call.state STRING (MANDATORY TRUE)
CREATE PROPERTY Call.startTime DATETIME (MANDATORY TRUE)
CREATE PROPERTY Call.endTime DATETIME
CREATE PROPERTY Call.duration INTEGER
CREATE PROPERTY Call.queueTime INTEGER
CREATE PROPERTY Call.holdTime INTEGER
CREATE PROPERTY Call.recording STRING
CREATE PROPERTY Call.tags EMBEDDEDLIST STRING
CREATE PROPERTY Call.priority INTEGER
CREATE PROPERTY Call.metadata EMBEDDEDMAP
```

**Indexes:**
```sql
CREATE INDEX Call.id UNIQUE
CREATE INDEX Call.state NOTUNIQUE
CREATE INDEX Call.startTime NOTUNIQUE
```

### Queue

Represents a call queue.

**Properties:**
```sql
CREATE PROPERTY Queue.name STRING (MANDATORY TRUE)
CREATE PROPERTY Queue.extension STRING (MANDATORY TRUE)
CREATE PROPERTY Queue.priority INTEGER
CREATE PROPERTY Queue.maxWaitTime INTEGER
CREATE PROPERTY Queue.strategy STRING
CREATE PROPERTY Queue.metadata EMBEDDEDMAP
CREATE PROPERTY Queue.createdAt DATETIME
```

**Indexes:**
```sql
CREATE INDEX Queue.extension UNIQUE
CREATE INDEX Queue.name NOTUNIQUE
```

### Skill

Represents an agent skill.

**Properties:**
```sql
CREATE PROPERTY Skill.name STRING (MANDATORY TRUE)
CREATE PROPERTY Skill.category STRING (MANDATORY TRUE)
CREATE PROPERTY Skill.description STRING
```

**Indexes:**
```sql
CREATE INDEX Skill.name_category UNIQUE (name, category)
```

## Edge Classes

### HandledBy

Links calls to agents who handled them.

**Properties:**
```sql
CREATE PROPERTY HandledBy.assignedAt DATETIME
CREATE PROPERTY HandledBy.answeredAt DATETIME
CREATE PROPERTY HandledBy.endedAt DATETIME
CREATE PROPERTY HandledBy.outcome STRING
```

**Structure:**
```
Call --[HandledBy]--> Agent
```

**Example Query:**
```sql
-- Get all calls handled by an agent
SELECT expand(in('HandledBy')) FROM #25:0

-- Get agent who handled a call
SELECT expand(out('HandledBy')) FROM Call WHERE id = 'call_123'
```

### HasSkill

Links agents to their skills.

**Properties:**
```sql
CREATE PROPERTY HasSkill.level INTEGER
CREATE PROPERTY HasSkill.acquiredAt DATETIME
CREATE PROPERTY HasSkill.certifiedAt DATETIME
```

**Structure:**
```
Agent --[HasSkill]--> Skill
```

**Example Query:**
```sql
-- Get all skills for an agent
SELECT out('HasSkill') FROM Agent WHERE email = 'john@example.com'

-- Get all agents with a skill
SELECT expand(in('HasSkill')) FROM Skill WHERE name = 'Technical Support'
```

### InQueue

Links agents to queues they serve.

**Properties:**
```sql
CREATE PROPERTY InQueue.addedAt DATETIME
CREATE PROPERTY InQueue.priority INTEGER
CREATE PROPERTY InQueue.active BOOLEAN
```

**Structure:**
```
Agent --[InQueue]--> Queue
```

**Example Query:**
```sql
-- Get all agents in a queue
SELECT expand(in('InQueue')) FROM Queue WHERE extension = '5000'

-- Get all queues for an agent
SELECT expand(out('InQueue')) FROM #25:0
```

## Common Queries

### Agent Queries

**Get available agents with specific skill:**
```sql
SELECT FROM Agent 
WHERE status = 'available' 
  AND out('HasSkill').name CONTAINS 'Technical Support'
  AND currentLoad < maxConcurrentCalls
```

**Get agent with call history:**
```sql
SELECT 
  *,
  in('HandledBy') as calls,
  in('HandledBy').size() as totalHandledCalls
FROM Agent 
WHERE email = 'john@example.com'
```

**Get top performers:**
```sql
SELECT name, email, totalCalls, averageHandleTime
FROM Agent
WHERE status != 'offline'
ORDER BY totalCalls DESC, averageHandleTime ASC
LIMIT 10
```

### Call Queries

**Get active calls:**
```sql
SELECT FROM Call 
WHERE state IN ['ringing', 'active', 'connecting']
ORDER BY startTime ASC
```

**Get call statistics for today:**
```sql
SELECT 
  COUNT(*) as totalCalls,
  AVG(duration) as avgDuration,
  AVG(queueTime) as avgQueueTime
FROM Call
WHERE startTime >= date('2024-01-01', 'yyyy-MM-dd')
```

**Get calls by agent:**
```sql
SELECT 
  call.id,
  call.from,
  call.startTime,
  call.duration,
  call.state
FROM (
  SELECT expand(in('HandledBy')) FROM #25:0
) as call
ORDER BY call.startTime DESC
```

### Skill Queries

**Get agents grouped by skill:**
```sql
SELECT 
  name as skillName,
  in('HasSkill').name as agents,
  in('HasSkill').size() as agentCount
FROM Skill
GROUP BY name
```

**Find skill gaps:**
```sql
SELECT name, category
FROM Skill
WHERE in('HasSkill').size() < 2
```

### Queue Queries

**Get queue statistics:**
```sql
SELECT 
  name,
  extension,
  in('InQueue').size() as agentCount,
  in('InQueue')[status='available'].size() as availableAgents
FROM Queue
```

**Get busiest queues:**
```sql
SELECT 
  queue.name,
  COUNT(*) as callsToday
FROM (
  SELECT expand(out('InQueue')) as queue
  FROM Call
  WHERE startTime >= date('2024-01-01', 'yyyy-MM-dd')
) 
GROUP BY queue.name
ORDER BY callsToday DESC
```

## Graph Traversal Examples

### Multi-hop queries

**Get all agents who handled calls from a specific customer:**
```sql
SELECT DISTINCT expand(out('HandledBy'))
FROM Call
WHERE from LIKE '%customer@domain.com%'
```

**Get skill distribution in a queue:**
```sql
SELECT 
  skill.name,
  COUNT(*) as agentCount
FROM (
  SELECT expand(out('HasSkill')) as skill
  FROM (
    SELECT expand(in('InQueue'))
    FROM Queue WHERE extension = '5000'
  )
)
GROUP BY skill.name
```

**Get call flow for an agent:**
```sql
TRAVERSE * FROM #25:0
```

## Maintenance

### Cleanup old calls

```sql
DELETE FROM Call 
WHERE startTime < date('2024-01-01', 'yyyy-MM-dd')
  AND state = 'ended'
```

### Reset agent stats

```sql
UPDATE Agent 
SET totalCalls = 0, 
    currentLoad = 0
WHERE status = 'offline'
```

### Rebuild indexes

```sql
REBUILD INDEX Agent.email
REBUILD INDEX Call.id
```

## Backup & Restore

### Backup

```bash
# Backup database
cd /path/to/orientdb
bin/console.sh "CONNECT plocal:databases/smart_sip admin admin; EXPORT DATABASE backup.json.gz"
```

### Restore

```bash
# Restore database
bin/console.sh "CREATE DATABASE plocal:databases/smart_sip; IMPORT DATABASE backup.json.gz"
```

## Performance Tips

1. **Use indexes** for frequently queried fields
2. **Limit results** with `LIMIT` clause
3. **Use projections** to select only needed fields
4. **Cache results** in Redis for expensive queries
5. **Batch operations** when possible

## Migration Scripts

See `apps/backend/src/database/migrations/` for version-specific schema changes.

Run migrations:
```bash
npm run migrate --workspace=apps/backend
```

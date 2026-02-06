# Smart Routing Configuration Guide

## Overview

The Smart Routing Engine uses a weighted scoring algorithm to find the best agent for each call based on multiple factors:

- **Availability** (40%) - Agent capacity and current load
- **Skill Match** (30%) - How well agent skills match call requirements
- **Load Balance** (20%) - Fair distribution across agents
- **Priority** (10%) - Call urgency/importance

## How It Works

### Scoring Algorithm

For each available agent, the system calculates a score (0-1):

```
score = (availability × 0.4) + (skillMatch × 0.3) + (loadBalance × 0.2) + (priority × 0.1)
```

**Example:**

```typescript
Agent A:
- Availability: 0.8 (1 call, can handle 2)
- Skill Match: 1.0 (perfect match)
- Load Balance: 0.5 (moderate load)
- Priority: 0.5 (normal priority)

Score = (0.8 × 0.4) + (1.0 × 0.3) + (0.5 × 0.2) + (0.5 × 0.1)
      = 0.32 + 0.30 + 0.10 + 0.05
      = 0.77
```

The agent with the highest score gets the call.

---

## Configuration

### Adjusting Routing Weights

You can customize the importance of each factor:

```typescript
// Via API
POST /api/routing/weights
{
  "availability": 0.5,    // Increase availability importance
  "skillMatch": 0.3,
  "loadBalance": 0.15,
  "priority": 0.05
}

// Via code
import { SmartRoutingEngine } from '@smart-sip/smart-routing';

const engine = new SmartRoutingEngine({
  availability: 0.5,
  skillMatch: 0.3,
  loadBalance: 0.15,
  priority: 0.05
});
```

**Use Cases:**

| Scenario | Recommended Weights |
|----------|-------------------|
| Skill-focused | availability: 0.3, skillMatch: 0.5, loadBalance: 0.15, priority: 0.05 |
| Load-balanced | availability: 0.25, skillMatch: 0.25, loadBalance: 0.4, priority: 0.1 |
| Priority-driven | availability: 0.3, skillMatch: 0.2, loadBalance: 0.1, priority: 0.4 |
| Even distribution | availability: 0.25, skillMatch: 0.25, loadBalance: 0.25, priority: 0.25 |

---

## Routing Strategies

### 1. Skill-Based Routing

Routes calls to agents with matching skills:

```typescript
const agent = await routingEngine.skillBasedRouting(
  [
    { name: 'Technical Support', category: 'support', level: 5 },
    { name: 'Billing', category: 'finance', level: 3 }
  ],
  true  // Allow partial match
);
```

**How it works:**
1. Finds agents with **all** required skills (exact match)
2. If none found, finds agents with **some** skills (partial match)
3. Falls back to any available agent

**Skill Levels:**
- 1-3: Basic
- 4-7: Intermediate
- 8-10: Expert

Agents must have skill level ≥ required level.

### 2. Round Robin with Scoring

Distributes calls evenly while considering agent quality:

```typescript
const agents = routingEngine.roundRobinWithScore(
  availableAgents,
  requiredSkills
);

const nextAgent = agents[0]; // Best agent with lowest call count
```

**Algorithm:**
1. Score all agents
2. Sort by score (highest first)
3. Break ties using `totalCallsToday` (lowest first)

### 3. Priority Routing

For VIP or emergency calls (priority 1-10):

```typescript
const agent = await routingEngine.priorityRouting(
  10,  // Highest priority
  requiredSkills
);
```

**Priority Levels:**
- 1-3: Low
- 4-7: Normal
- 8-9: High
- 10: Emergency/VIP

High priority (≥8) routes to the absolute best agent regardless of load.

### 4. Time-Based Routing

Routes differently based on business hours:

```typescript
const agent = await routingEngine.timeBasedRouting(
  agents,
  queue,
  new Date()
);
```

**Business Hours:** Monday-Friday, 9 AM - 5 PM (configurable)

**After Hours:**
- Routes only to agents with `metadata.onCall === true`
- Falls back to voicemail if no on-call agents

### 5. Predictive Routing

Routes based on caller history:

```typescript
const agent = await routingEngine.predictiveRouting(
  agents,
  {
    previousCallCount: 3,
    lastAgentId: '#25:0',
    customerId: '12345'
  },
  requiredSkills
);
```

**Logic:**
1. If caller has history with specific agent → route to that agent
2. Otherwise, use standard smart routing

---

## Queue Configuration

### Creating Queues

```typescript
{
  "name": "Support Queue",
  "extension": "5000",
  "priority": 1,
  "maxWaitTime": 300,  // 5 minutes
  "strategy": "skill_based",
  "requiredSkills": [
    { "name": "Technical Support", "category": "support", "level": 5 }
  ]
}
```

### Queue Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `round_robin` | Simple rotation | Equal distribution |
| `least_busy` | Route to agent with lowest load | Load balancing |
| `skill_based` | Match skills first | Specialized support |
| `priority` | Honor call priority | VIP customers |
| `ai_powered` | ML-based routing (future) | Complex routing |

### Queue Priority

Multiple queues can have different priorities (1-10):
- Higher priority queues get served first
- Calls in high-priority queues jump ahead

**Example:**
```
VIP Queue (priority: 10)
Support Queue (priority: 5)
General Queue (priority: 1)
```

---

## Agent Configuration

### Skills

Define agent expertise:

```typescript
{
  "skills": [
    {
      "name": "Technical Support",
      "category": "support",
      "level": 8  // 1-10
    },
    {
      "name": "Billing",
      "category": "finance",
      "level": 6
    }
  ]
}
```

**Skill Categories:**
- `support` - Customer support
- `sales` - Sales inquiries
- `finance` - Billing/payments
- `technical` - Technical issues
- `custom` - Custom categories

### Availability Score

Manual override for agent quality (0-1):

```typescript
{
  "availability": 0.9  // 90% quality score
}
```

Use cases:
- New agents: 0.5-0.7
- Experienced agents: 0.8-0.9
- Senior agents: 1.0

### Max Concurrent Calls

```typescript
{
  "maxConcurrentCalls": 2  // Can handle 2 calls at once
}
```

**Recommendations:**
- New agents: 1
- Experienced: 2-3
- Supervisors: 1-2

---

## Advanced Configuration

### Custom Routing Logic

Create custom routing rules:

```typescript
import { SmartRoutingEngine } from '@smart-sip/smart-routing';

class CustomRoutingEngine extends SmartRoutingEngine {
  async customRoute(call, agents) {
    // Your custom logic
    if (call.metadata.vip) {
      return this.priorityRouting(agents, 10);
    }
    
    if (isAfterHours()) {
      return this.timeBasedRouting(agents, queue);
    }
    
    return this.findBestAgent(agents, call.requiredSkills);
  }
}
```

### Dynamic Weight Adjustment

Adjust weights based on conditions:

```typescript
// Busy hours: prioritize load balance
if (activeCalls > 50) {
  engine.updateWeights({
    availability: 0.2,
    loadBalance: 0.5
  });
}

// After hours: prioritize availability
if (!isBusinessHours()) {
  engine.updateWeights({
    availability: 0.7,
    skillMatch: 0.2
  });
}
```

---

## Monitoring & Analytics

### Get Routing Recommendations

See all agent scores before routing:

```http
POST /api/routing/scores
```

Response:
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
  }
]
```

### Track Routing Success

Monitor these metrics:
- **First Call Resolution (FCR):** Did agent resolve issue?
- **Average Handle Time (AHT):** Call duration
- **Transfer Rate:** How often calls get transferred
- **Customer Satisfaction:** Post-call surveys

### Optimization Tips

1. **Review skill definitions monthly**
   - Are categories still relevant?
   - Do levels match actual expertise?

2. **Adjust weights based on KPIs**
   - High transfer rate? Increase `skillMatch`
   - Uneven load? Increase `loadBalance`
   - Long wait times? Increase `availability`

3. **Monitor agent performance**
   - Update `availability` score based on metrics
   - Reward high performers with better scores

4. **A/B test routing strategies**
   - Compare different weight configurations
   - Measure impact on KPIs

---

## Best Practices

✅ **DO:**
- Start with default weights
- Gradually adjust based on data
- Define clear skill categories
- Set realistic skill levels
- Monitor routing outcomes

❌ **DON'T:**
- Make weights add up to > 1.0
- Change weights too frequently
- Over-categorize skills
- Set all agents to skill level 10
- Ignore routing analytics

---

## Troubleshooting

### No agents being selected

**Causes:**
- All agents offline/busy
- Skill requirements too strict
- `maxConcurrentCalls` limits reached

**Solutions:**
- Check agent status
- Lower required skill levels
- Enable `allowPartialMatch`
- Increase agent capacity

### Uneven call distribution

**Causes:**
- `loadBalance` weight too low
- Agent skill levels vary greatly
- Some agents have higher `availability` scores

**Solutions:**
- Increase `loadBalance` weight
- Use `round_robin` strategy
- Normalize agent `availability` scores

### Wrong agent getting calls

**Causes:**
- Skill levels not accurate
- `skillMatch` weight too low
- Agent availability scores off

**Solutions:**
- Review and update agent skills
- Increase `skillMatch` weight
- Audit agent configurations

---

## Examples

See [examples/routing](../examples/routing/) for:
- Complete routing configurations
- Custom routing implementations
- Integration examples
- Performance benchmarks

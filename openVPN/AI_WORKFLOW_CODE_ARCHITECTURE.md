# AI Workflow Code Architecture

## Complete Data Flow: From User Instruction to VPN Operation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER / EXTERNAL CLIENT                             │
│                    (Flutter UI, cURL, REST Client)                          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ (1) POST Request with Natural Language
                                   │ {"instruction": "Create peer for Bob"}
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AXUM REST API SERVER (Port 8080)                       │
│                                                                              │
│  Router Configuration:                                                      │
│  .route("/api/v1/ai/plan-execution", post(plan_ai_execution))              │
│  .route("/api/v1/ai/execute-plan", post(execute_ai_plan))                  │
│  .route("/api/v1/ai/query-status", post(query_status_with_ai))             │
│  .route("/api/tools/peers", post(create_peer_tool))                        │
│  .route("/api/tools/peers", get(list_peers_tool))                          │
│  ... [13 total routes]                                                      │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            │ (2A)         │ (2B)         │ (2C)
            │ Planning     │ Execution    │ Query
            ▼              ▼              ▼
    ┌───────────────┐ ┌────────────┐ ┌──────────────┐
    │  Plan Handler │ │  Execute   │ │   Query      │
    │  (plan_ai_    │ │  Handler   │ │   Handler    │
    │  execution)   │ │  (execute_ │ │   (query_    │
    │               │ │  ai_plan)  │ │   status_    │
    │ Input:        │ │            │ │   with_ai)   │
    │ Instruction   │ │ Input:     │ │              │
    │               │ │ Plan       │ │ Input:       │
    │ Output:       │ │            │ │ Query        │
    │ Execution     │ │ Output:    │ │              │
    │ Plan          │ │ Results    │ │ Output:      │
    └───────┬───────┘ └────┬───────┘ │ Response    │
            │               │         └──────────────┘
            │ (3)           │ (5)
            │ Calls:        │ Calls:
            │ AIOrchestra-  │ AIOrchestra-
            │ tor::plan_    │ tor::execute_
            │ execution()   │ plan()
            ▼               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │          AI ORCHESTRATOR (ai_orchestrator.rs)               │
    │                                                             │
    │  Struct AIOrchestrator {                                   │
    │    http_client: reqwest::Client,                           │
    │    deepseek_api_key: String,                              │
    │    deepseek_api_url: String,                              │
    │    base_url: String (localhost:8080),                     │
    │  }                                                         │
    │                                                             │
    │  Methods:                                                  │
    │  ├─ plan_execution(instruction) -> ExecutionPlan           │
    │  │  ├─ call_deepseek_planning()  ←─────┐ (4A)            │
    │  │  │  └─ HTTP POST to DeepSeek        │ EXTERNAL       │
    │  │  └─ Parse JSON response             │ CALL           │
    │  │                                      ──────→ API      │
    │  ├─ execute_plan(plan) -> ExecutionResult                 │
    │  │  └─ For each tool in plan:                             │
    │  │    ├─ call_tool()  ←─────┐ (6A)                      │
    │  │    │  └─ HTTP POST/GET/DELETE to /api/tools/*        │
    │  │    │    (local, same server)                          │
    │  │    └─ Capture ToolResult                              │
    │  ├─ query_status(query)                                   │
    │  │  ├─ fetch_current_status()                             │
    │  │  │  └─ HTTP GET /api/tools/get_status                 │
    │  │  └─ call_deepseek_analysis()  ←─────┐ (7A)           │
    │  │     └─ HTTP POST to DeepSeek        │ EXTERNAL      │
    │  └─ detect_and_suggest_fixes()         │ CALL          │
    │     └─ call_deepseek_anomaly_detection()───────→ API   │
    │                                                             │
    └──────────┬─────────────────────────────────────────────────┘
               │
    ┌──────────┴─────────────────────────────────────────┐
    │                                                     │
    │ (4A) Calls DeepSeek API ────────────────────────┐ │
    │                                                 │ │
    │ call_deepseek_planning(instruction)             │ │
    │ {                                               │ │
    │   "messages": [                                 │ │
    │     {"role": "system",                          │ │
    │      "content": "Available tools: create_peer.."},│
    │     {"role": "user",                            │ │
    │      "content": instruction}                   │ │
    │   ],                                            │ │
    │   "model": "deepseek-chat",                     │ │
    │   "temperature": 0.7,                          │ │
    │   "max_tokens": 2000                           │ │
    │ }                                               │ │
    │ ────────────────────────────────────────────────┼─┘
    │                         │
    │                         │ (4B) HTTP POST
    │                         │ https://api.deepseek.com/v1/chat/completions
    │                         ▼
    │                    ┌──────────────────┐
    │                    │  DeepSeek API    │
    │                    │                  │
    │                    │  AI Processes:   │
    │                    │  1. Understands  │
    │                    │     instruction  │
    │                    │  2. Reviews      │
    │                    │     tools        │
    │                    │  3. Chooses      │
    │                    │     tools &      │
    │                    │     order        │
    │                    │  4. Generates    │
    │                    │     reasoning    │
    │                    │  5. Returns      │
    │                    │     JSON plan    │
    │                    └────────┬─────────┘
    │                             │
    │                             │ (4C) Response:
    │                             │ {
    │                             │   "choices": [{
    │                             │     "message": {
    │                             │       "content": "
    │                             │         {
    │                             │           \"tools\": [{
    │                             │             \"name\": \"create_peer\",
    │                             │             \"params\": {...}
    │                             │           }],
    │                             │           \"reasoning\": \"...\"
    │                             │         }
    │                             │       "
    │                             │     }
    │                             │   }]
    │                             │ }
    │                             │
    └─────────────────────────────┘
                                  │
                                  │ (5A) Parse response
                                  │
    ┌─────────────────────────────────────────────────────────────┐
    │  EXECUTION PHASE                                            │
    │                                                             │
    │  For each tool in order:                                   │
    │                                                             │
    │  Tool: create_peer                                         │
    │  ├─ call_tool(create_peer)  ──────────┐ (6A)            │
    │  │  └─ HTTP POST                      │                 │
    │  │     http://localhost:8080/api/tools/peers │          │
    │  │     {                               │ REQUEST        │
    │  │       "peer_name": "bob",           │                 │
    │  │       "allowed_ips": "10.0.0.2/32" │                 │
    │  │     }                               │                 │
    │  │                                     │                 │
    │  └─────────────────────────────────────┼──────────────────│
    │                                        │                 │
    │                                        ▼                 │
    │                    ┌────────────────────────────────────┐│
    │                    │ Tool Handler: create_peer_tool() ││
    │                    │                                   ││
    │                    │ async fn create_peer_tool(       ││
    │                    │   State(state): State<AppState>, ││
    │                    │   Json(req): Json<CreatePeerReq> ││
    │                    │ ) -> Json<CreatePeerResponse>    ││
    │                    │ {                                 ││
    │                    │   let mgr = state              ││
    │                    │     .peer_manager               ││
    │                    │     .lock()                     ││
    │                    │     .await;                     ││
    │                    │                                   ││
    │                    │   mgr.create_peer(              ││
    │                    │     req.peer_name,              ││
    │                    │     req.allowed_ips,            ││
    │                    │     req.endpoint,               ││
    │                    │     req.persistent_keepalive    ││
    │                    │   ).await                       ││
    │                    │ }                                 ││
    │                    └────────┬─────────────────────────┘│
    │                             │                         │
    │                             │ (6B) Calls              │
    │                             ▼                         │
    │                    ┌──────────────────────┐           │
    │                    │ PeerManager::        │           │
    │                    │ create_peer()        │           │
    │                    │                      │           │
    │                    │ 1. Generate keys     │           │
    │                    │    using WireGuard   │           │
    │                    │ 2. Execute:          │           │
    │                    │    wg set wg0 peer   │           │
    │                    │ 3. Return response   │           │
    │                    │                      │           │
    │                    └──────────┬───────────┘           │
    │                             │                         │
    │                             │ (6C) Response:          │
    │                             │ {                       │
    │                             │   "peer_id": "peer_1",  │
    │                             │   "public_key": "...",  │
    │                             │   "private_key": "...", │
    │                             │   "allowed_ips": "...", │
    │                             │   "status": "success"   │
    │                             │ }                       │
    │                             │                         │
    │  Tool Result Captured ◄─────┴─────────────────────────┘
    │  {
    │    "tool_name": "create_peer",
    │    "success": true,
    │    "result": { /* response above */ },
    │    "timestamp": 1700000000
    │  }
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
                      │
                      │ (7) Aggregate results
                      │
    ┌─────────────────────────────────────────────────────────────┐
    │  FINAL RESULT                                               │
    │                                                             │
    │  ExecutionResult {                                         │
    │    plan_id: "plan-abc123",                               │
    │    status: "success",  // or "partial_success"           │
    │    tool_results: [                                        │
    │      {                                                    │
    │        "tool_name": "create_peer",                       │
    │        "success": true,                                  │
    │        "result": { /* peer data */ },                    │
    │        "timestamp": 1700000000                           │
    │      }                                                    │
    │    ],                                                    │
    │    summary: "Peer created successfully"                  │
    │  }                                                        │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
                      │
                      │ (8) Return to client
                      │
                      ▼
            ┌──────────────────────┐
            │ HTTP 200 JSON        │
            │ Response to Client   │
            └──────────────────────┘
```

---

## Code Structure Breakdown

### **Layer 1: HTTP Handler Functions** (daemon.rs)

```rust
// AI Orchestration Handlers
async fn plan_ai_execution(
    State(state): State<AppState>,
    Json(req): Json<AIInstruction>,
) -> Json<AIExecutionPlan> {
    info!("Planning execution for: {}", req.instruction);
    
    match state.ai_orchestrator.plan_execution(req).await {
        Ok(plan) => Json(plan),
        Err(e) => Json(/* fallback plan */)
    }
}

async fn execute_ai_plan(
    State(state): State<AppState>,
    Json(plan): Json<AIExecutionPlan>,
) -> Json<ExecutionResult> {
    info!("Executing plan: {}", plan.plan_id);
    
    match state.ai_orchestrator.execute_plan(plan).await {
        Ok(result) => Json(result),
        Err(e) => Json(/* error result */)
    }
}

// Tool Handlers
async fn create_peer_tool(
    State(state): State<AppState>,
    Json(req): Json<tools::CreatePeerRequest>,
) -> Json<tools::CreatePeerResponse> {
    let mgr = state.peer_manager.lock().await;
    
    match mgr.create_peer(
        req.peer_name,
        req.allowed_ips,
        req.endpoint,
        req.persistent_keepalive,
    ).await {
        Ok(response) => Json(response),
        Err(e) => Json(/* error response */)
    }
}

async fn list_peers_tool(
    State(state): State<AppState>,
) -> Json<tools::ListPeersResponse> {
    let mgr = state.peer_manager.lock().await;
    
    match mgr.list_peers("wg0").await {
        Ok(peers) => {
            Json(tools::ListPeersResponse {
                peers,
                total: peers.len(),
            })
        }
        Err(_) => Json(/* empty response */)
    }
}

// ... more tool handlers
```

### **Layer 2: AI Orchestrator** (ai_orchestrator.rs)

```rust
pub struct AIOrchestrator {
    base_url: String,                           // "http://localhost:8080"
    deepseek_api_key: String,
    deepseek_api_url: String,                   // "https://api.deepseek.com/v1/chat/completions"
    http_client: Client,                        // reqwest::Client
}

impl AIOrchestrator {
    // Planning Phase
    pub async fn plan_execution(
        &self,
        instruction: AIInstruction,
    ) -> Result<AIExecutionPlan, String> {
        // Step 1: Call DeepSeek AI
        let plan = self.call_deepseek_planning(&instruction).await?;
        
        // Step 2: Return structured plan
        Ok(plan)
    }
    
    async fn call_deepseek_planning(
        &self,
        instruction: &AIInstruction,
    ) -> Result<AIExecutionPlan, String> {
        // Build request with system prompt
        let request = DeepSeekRequest {
            messages: vec![
                DeepSeekMessage {
                    role: "system".to_string(),
                    content: SYSTEM_PROMPT_WITH_AVAILABLE_TOOLS.to_string(),
                },
                DeepSeekMessage {
                    role: "user".to_string(),
                    content: instruction.instruction.clone(),
                },
            ],
            model: "deepseek-chat".to_string(),
            temperature: 0.7,
            max_tokens: 2000,
        };
        
        // Make HTTP request to DeepSeek
        let response = self.http_client
            .post(&self.deepseek_api_url)
            .bearer_auth(&self.deepseek_api_key)
            .json(&request)
            .send()
            .await?;
        
        // Parse response
        if response.status().is_success() {
            let deepseek_response = response.json::<DeepSeekResponse>().await?;
            
            if let Some(choice) = deepseek_response.choices.first() {
                // Parse DeepSeek's JSON response
                let parsed = serde_json::from_str::<serde_json::Value>(
                    &choice.message.content
                )?;
                
                // Convert to AIExecutionPlan
                let tools = parsed
                    .get("tools")
                    .and_then(|v| v.as_array())
                    .unwrap_or(&empty_array);
                
                let tool_calls: Vec<ToolCall> = tools.iter().enumerate()
                    .filter_map(|(idx, tool_obj)| {
                        Some(ToolCall {
                            tool_name: tool_obj.get("name")?.as_str()?.to_string(),
                            parameters: tool_obj.get("params")?.clone()?,
                            description: tool_obj.get("description")?.as_str()?.to_string(),
                            order: (idx + 1) as u32,
                        })
                    })
                    .collect();
                
                Ok(AIExecutionPlan {
                    plan_id: format!("plan-{}", uuid::Uuid::new_v4()),
                    instruction: instruction.instruction.clone(),
                    tools_to_call: tool_calls,
                    reasoning: parsed.get("reasoning")?.as_str()?.to_string(),
                    estimated_duration_ms: parsed.get("estimated_duration_ms")
                        .and_then(|v| v.as_u64()).unwrap_or(5000) as u32,
                    risk_level: parsed.get("risk_level")?.as_str()?.to_string(),
                })
            } else {
                Err("No response from DeepSeek".to_string())
            }
        } else {
            Err(format!("DeepSeek API error: {}", response.status()))
        }
    }
    
    // Execution Phase
    pub async fn execute_plan(
        &self,
        plan: AIExecutionPlan,
    ) -> Result<ExecutionResult, String> {
        let mut tool_results = Vec::new();
        let mut all_success = true;
        
        // Sort tools by order
        let mut sorted_tools = plan.tools_to_call.clone();
        sorted_tools.sort_by_key(|t| t.order);
        
        // Execute each tool
        for tool in sorted_tools {
            match self.call_tool(&tool).await {
                Ok(result) => {
                    tool_results.push(ToolResult {
                        tool_name: tool.tool_name,
                        success: true,
                        result: Some(result),
                        error: None,
                        timestamp: chrono::Local::now().timestamp(),
                    });
                }
                Err(e) => {
                    all_success = false;
                    tool_results.push(ToolResult {
                        tool_name: tool.tool_name,
                        success: false,
                        result: None,
                        error: Some(e),
                        timestamp: chrono::Local::now().timestamp(),
                    });
                }
            }
        }
        
        // Return aggregated results
        Ok(ExecutionResult {
            plan_id: plan.plan_id,
            status: if all_success { "success".to_string() } else { "partial_success".to_string() },
            tool_results,
            summary: "Execution completed".to_string(),
        })
    }
    
    // Tool Invocation
    async fn call_tool(
        &self,
        tool: &ToolCall,
    ) -> Result<serde_json::Value, String> {
        // Build URL
        let url = format!("{}/api/tools/{}", self.base_url, tool.tool_name);
        
        // Determine HTTP method and execute
        let request = match tool.tool_name.as_str() {
            "create_peer" | "validate_config" | "update_allowed_ips" => {
                self.http_client
                    .post(&url)
                    .json(&tool.parameters)
            }
            "delete_peer" | "rotate_keys" => {
                let peer_id = tool.parameters.get("peer_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                self.http_client
                    .delete(format!("{}/{}", url, peer_id))
            }
            "list_peers" | "get_status" | "health_check" => {
                self.http_client.get(&url)
            }
            _ => return Err(format!("Unknown tool: {}", tool.tool_name))
        };
        
        // Send request
        let response = request.send().await?;
        
        // Parse response
        if response.status().is_success() {
            response.json::<serde_json::Value>().await
                .map_err(|e| e.to_string())
        } else {
            Err(format!("Tool returned error: {}", response.status()))
        }
    }
}
```

### **Layer 3: Tool Implementations** (peer_manager.rs, config_validator.rs)

```rust
pub struct PeerManager {
    wg_manager: WireGuardManager,
}

impl PeerManager {
    pub async fn create_peer(
        &self,
        peer_name: String,
        allowed_ips: String,
        endpoint: Option<String>,
        persistent_keepalive: Option<u16>,
    ) -> Result<CreatePeerResponse, String> {
        // Generate cryptographic keys
        let (private_key, public_key) = config::generate_key_pair()?;
        
        // Add peer to WireGuard
        // wg set wg0 peer <public_key> allowed-ips <allowed_ips> ...
        self.wg_manager.add_peer(
            "wg0",
            public_key.clone(),
            allowed_ips.clone(),
            endpoint,
            persistent_keepalive,
        ).await?;
        
        // Return response
        Ok(CreatePeerResponse {
            peer_id: peer_name.clone(),
            public_key,
            private_key,
            allowed_ips,
            status: "success".to_string(),
        })
    }
    
    pub async fn list_peers(&self, interface: &str) -> Result<Vec<PeerInfo>, String> {
        // Execute: wg show wg0 peers
        let output = self.wg_manager.get_interface_status(interface).await?;
        
        // Parse output and return peer list
        self.parse_peers_from_status(&output)
    }
}

pub struct ConfigValidator;

impl ConfigValidator {
    pub fn validate_config(config_content: &str) -> ValidateConfigResponse {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut suggestions = Vec::new();
        
        // Validate [Interface] section
        if let Some(interface_section) = config_content.split("[Peer]").next() {
            // Check required fields
            if !interface_section.contains("PrivateKey") {
                errors.push("Missing PrivateKey in [Interface]".to_string());
            }
            if !interface_section.contains("Address") {
                errors.push("Missing Address in [Interface]".to_string());
            }
            
            // Validate Address is valid CIDR
            // ...
            
            // Validate keys are base64 encoded
            // ...
        }
        
        // Validate [Peer] sections
        // ...
        
        ValidateConfigResponse {
            valid: errors.is_empty(),
            errors,
            warnings,
            suggestions,
        }
    }
}
```

---

## HTTP Request/Response Examples

### **Request 1: Get Execution Plan**

```http
POST /api/v1/ai/plan-execution HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "instruction": "Create a VPN peer for Alice with access to 10.0.0.0/24",
  "context": {
    "environment": "production"
  },
  "user_id": "admin"
}
```

### **Response 1: Execution Plan**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "plan_id": "plan-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "instruction": "Create a VPN peer for Alice with access to 10.0.0.0/24",
  "tools_to_call": [
    {
      "tool_name": "create_peer",
      "parameters": {
        "peer_name": "alice",
        "allowed_ips": "10.0.0.0/24",
        "endpoint": null,
        "persistent_keepalive": 25
      },
      "description": "Create VPN peer with appropriate network access",
      "order": 1
    },
    {
      "tool_name": "validate_config",
      "parameters": {
        "config_content": "[Interface]\n..."
      },
      "description": "Validate the resulting WireGuard configuration",
      "order": 2
    }
  ],
  "reasoning": "First create the peer with corporate network access, then validate the entire configuration to ensure consistency",
  "estimated_duration_ms": 3500,
  "risk_level": "low"
}
```

### **Request 2: Execute Plan**

```http
POST /api/v1/ai/execute-plan HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "plan_id": "plan-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "instruction": "Create a VPN peer for Alice with access to 10.0.0.0/24",
  "tools_to_call": [
    {
      "tool_name": "create_peer",
      "parameters": {...},
      "description": "...",
      "order": 1
    },
    {
      "tool_name": "validate_config",
      "parameters": {...},
      "description": "...",
      "order": 2
    }
  ],
  "reasoning": "...",
  "estimated_duration_ms": 3500,
  "risk_level": "low"
}
```

### **Response 2: Execution Results**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "plan_id": "plan-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "success",
  "tool_results": [
    {
      "tool_name": "create_peer",
      "success": true,
      "result": {
        "peer_id": "alice",
        "public_key": "eIGlM1qzqvqbKWLSR5fLxc/5VUSCvQh0OZfJON7Fum4=",
        "private_key": "kJhH9oLxYvZxNmQpTrVbC2d0F3gSxZyKpRmNqWlLtJ8=",
        "allowed_ips": "10.0.0.0/24",
        "status": "success"
      },
      "error": null,
      "timestamp": 1700000000
    },
    {
      "tool_name": "validate_config",
      "success": true,
      "result": {
        "valid": true,
        "errors": [],
        "warnings": [],
        "suggestions": [
          "Consider setting persistent-keepalive for stable connections",
          "Review firewall rules for peer endpoint"
        ]
      },
      "error": null,
      "timestamp": 1700000002
    }
  ],
  "summary": "All tools executed successfully. Peer created and configuration validated."
}
```

---

## Summary

This architecture implements a **three-layer AI orchestration system**:

1. **HTTP Handlers** - Accept requests, delegate to AI orchestrator
2. **AI Orchestrator** - Plan execution via DeepSeek, execute tools via HTTP
3. **Tool Implementations** - Actual VPN operations (peer management, config validation)

The key innovation is that **AI never touches the system directly** - it makes HTTP calls to well-defined tool APIs, enabling:
- Safe execution (no privilege escalation)
- Easy auditing (all API calls logged)
- Composability (tools can be combined in any order)
- Testability (each layer can be tested independently)

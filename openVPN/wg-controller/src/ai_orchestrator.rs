// AI Orchestrator Agent
// Interprets natural language instructions and calls Rust tools

use serde::{Deserialize, Serialize};
use log::{info, debug, warn, error};
use reqwest::Client;
use uuid::Uuid;
use chrono::Local;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIInstruction {
    pub instruction: String,
    pub context: Option<serde_json::Value>,
    pub user_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIExecutionPlan {
    pub plan_id: String,
    pub instruction: String,
    pub tools_to_call: Vec<ToolCall>,
    pub reasoning: String,
    pub estimated_duration_ms: u32,
    pub risk_level: String, // "low", "medium", "high"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub tool_name: String,
    pub parameters: serde_json::Value,
    pub description: String,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub plan_id: String,
    pub status: String, // "success", "partial_success", "failed"
    pub tool_results: Vec<ToolResult>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_name: String,
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekRequest {
    pub messages: Vec<DeepSeekMessage>,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekMessage {
    pub role: String, // "system", "user", "assistant"
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekResponse {
    pub choices: Vec<DeepSeekChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekChoice {
    pub message: DeepSeekMessage,
}

pub struct AIOrchestrator {
    base_url: String,
    deepseek_api_key: String,
    deepseek_api_url: String,
    http_client: Client,
}

impl AIOrchestrator {
    pub fn new(deepseek_api_key: String, rust_tools_base_url: String) -> Self {
        AIOrchestrator {
            base_url: rust_tools_base_url,
            deepseek_api_key,
            deepseek_api_url: "https://api.deepseek.com/v1/chat/completions".to_string(),
            http_client: Client::new(),
        }
    }

    /// Parse natural language instruction and create execution plan
    pub async fn plan_execution(
        &self,
        instruction: AIInstruction,
    ) -> Result<AIExecutionPlan, String> {
        info!("Planning execution for: {}", instruction.instruction);

        // Call DeepSeek to interpret the instruction
        let plan = self.call_deepseek_planning(&instruction).await?;

        Ok(plan)
    }

    /// Execute the planned tools in order
    pub async fn execute_plan(
        &self,
        plan: AIExecutionPlan,
    ) -> Result<ExecutionResult, String> {
        info!("Executing plan: {}", plan.plan_id);

        let mut tool_results = Vec::new();
        let mut all_success = true;

        // Sort tools by order and execute
        let mut sorted_tools = plan.tools_to_call.clone();
        sorted_tools.sort_by_key(|t| t.order);

        for tool in sorted_tools {
            debug!("Calling tool: {}", tool.tool_name);

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

        let status = if all_success {
            "success".to_string()
        } else {
            "partial_success".to_string()
        };

        Ok(ExecutionResult {
            plan_id: plan.plan_id,
            status,
            tool_results,
            summary: "Execution completed".to_string(),
        })
    }

    /// Natural language query about current state
    pub async fn query_status(
        &self,
        query: String,
    ) -> Result<String, String> {
        info!("Processing status query: {}", query);

        // Get current status from Rust tools
        let status = self.fetch_current_status().await?;

        // Call DeepSeek to analyze and respond
        self.call_deepseek_analysis(query, status).await
    }

    /// Detect anomalies and suggest remediation
    pub async fn detect_and_suggest_fixes(
        &self,
    ) -> Result<Vec<String>, String> {
        info!("Running anomaly detection");

        let status = self.fetch_current_status().await?;
        self.call_deepseek_anomaly_detection(status).await
    }

    // Private helpers

    async fn call_tool(
        &self,
        tool: &ToolCall,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/api/tools/{}", self.base_url, tool.tool_name);

        debug!("Calling tool at: {}", url);

        // Build HTTP request based on tool type
        let request = match tool.tool_name.as_str() {
            "create_peer" | "validate_config" | "update_allowed_ips" | "analyze_config" => {
                // POST requests with body parameters
                self.http_client
                    .post(&url)
                    .json(&tool.parameters)
            }
            "delete_peer" | "rotate_keys" => {
                // Path-based requests (peer_id in URL)
                let peer_id = tool
                    .parameters
                    .get("peer_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                self.http_client
                    .delete(format!("{}/{}", url, peer_id))
            }
            "list_peers" | "get_status" | "health_check" | "find_idle_peers" => {
                // GET requests
                self.http_client.get(&url)
            }
            _ => {
                warn!("Unknown tool: {}", tool.tool_name);
                return Err(format!("Unknown tool: {}", tool.tool_name));
            }
        };

        // Execute the request
        match request.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(body) => {
                            info!("Tool {} executed successfully", tool.tool_name);
                            Ok(body)
                        }
                        Err(e) => {
                            error!("Failed to parse response from {}: {}", tool.tool_name, e);
                            Err(format!("Failed to parse response: {}", e))
                        }
                    }
                } else {
                    error!("Tool {} returned error status: {}", tool.tool_name, response.status());
                    Err(format!("Tool returned error: {}", response.status()))
                }
            }
            Err(e) => {
                error!("Failed to call tool {}: {}", tool.tool_name, e);
                Err(format!("Failed to call tool: {}", e))
            }
        }
    }

    async fn fetch_current_status(
        &self,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/api/tools/get_status", self.base_url);

        debug!("Fetching current status from: {}", url);

        match self.http_client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(status) => {
                            info!("Successfully fetched current status");
                            Ok(status)
                        }
                        Err(e) => {
                            error!("Failed to parse status response: {}", e);
                            Err(format!("Failed to parse status: {}", e))
                        }
                    }
                } else {
                    error!("Status endpoint returned: {}", response.status());
                    Err(format!("Status endpoint error: {}", response.status()))
                }
            }
            Err(e) => {
                error!("Failed to fetch status: {}", e);
                Err(format!("Failed to fetch status: {}", e))
            }
        }
    }

    async fn call_deepseek_planning(
        &self,
        instruction: &AIInstruction,
    ) -> Result<AIExecutionPlan, String> {
        info!("Calling DeepSeek for planning: {}", instruction.instruction);

        // Prepare system prompt for planning
        let system_prompt = r#"You are an expert VPN orchestration agent. When given a natural language instruction, 
you must respond with a JSON plan that specifies exactly which tools to call and in what order.

Available tools:
1. create_peer - Create new VPN peer (params: peer_name, allowed_ips, endpoint, persistent_keepalive)
2. list_peers - List all VPN peers
3. delete_peer - Remove a peer (params: peer_id)
4. rotate_keys - Rotate peer keys (params: peer_id)
5. update_allowed_ips - Modify peer access (params: peer_id, allowed_ips)
6. validate_config - Validate config file (params: config_content)
7. analyze_config - Analyze config for issues (params: config)
8. get_status - Get current VPN status
9. health_check - Check system health
10. find_idle_peers - Find inactive peers

Respond ONLY with valid JSON in this format:
{
  "tools": [
    {"name": "tool_name", "params": {...}, "description": "what this does", "order": 1}
  ],
  "reasoning": "why you chose this sequence",
  "risk_level": "low|medium|high",
  "estimated_duration_ms": 5000
}"#;

        let user_message = format!("Plan this operation: {}", instruction.instruction);

        let request = DeepSeekRequest {
            messages: vec![
                DeepSeekMessage {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                DeepSeekMessage {
                    role: "user".to_string(),
                    content: user_message,
                },
            ],
            model: "deepseek-chat".to_string(),
            temperature: 0.7,
            max_tokens: 2000,
        };

        // Call DeepSeek API
        match self
            .http_client
            .post(&self.deepseek_api_url)
            .bearer_auth(&self.deepseek_api_key)
            .json(&request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<DeepSeekResponse>().await {
                        Ok(deepseek_response) => {
                            if let Some(choice) = deepseek_response.choices.first() {
                                debug!("DeepSeek response: {}", choice.message.content);

                                // Parse the JSON response from DeepSeek
                                match serde_json::from_str::<serde_json::Value>(
                                    &choice.message.content,
                                ) {
                                    Ok(parsed) => {
                                        // Convert DeepSeek response to our AIExecutionPlan
                                        let empty_array = vec![];
                                        let tools = parsed
                                            .get("tools")
                                            .and_then(|v| v.as_array())
                                            .unwrap_or(&empty_array);

                                        let mut tool_calls = Vec::new();
                                        for (idx, tool_obj) in tools.iter().enumerate() {
                                            if let Some(name) = tool_obj.get("name").and_then(|v| v.as_str()) {
                                                tool_calls.push(ToolCall {
                                                    tool_name: name.to_string(),
                                                    parameters: tool_obj
                                                        .get("params")
                                                        .cloned()
                                                        .unwrap_or(serde_json::json!({})),
                                                    description: tool_obj
                                                        .get("description")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("No description")
                                                        .to_string(),
                                                    order: (idx + 1) as u32,
                                                });
                                            }
                                        }

                                        let plan = AIExecutionPlan {
                                            plan_id: format!("plan-{}", Uuid::new_v4()),
                                            instruction: instruction.instruction.clone(),
                                            tools_to_call: tool_calls,
                                            reasoning: parsed
                                                .get("reasoning")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("AI-planned execution")
                                                .to_string(),
                                            estimated_duration_ms: parsed
                                                .get("estimated_duration_ms")
                                                .and_then(|v| v.as_u64())
                                                .unwrap_or(5000) as u32,
                                            risk_level: parsed
                                                .get("risk_level")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("medium")
                                                .to_string(),
                                        };

                                        info!("Successfully created execution plan with {} tools", plan.tools_to_call.len());
                                        Ok(plan)
                                    }
                                    Err(e) => {
                                        warn!("Failed to parse DeepSeek JSON response: {}", e);
                                        // Fallback to a default plan
                                        Ok(self.create_fallback_plan(instruction))
                                    }
                                }
                            } else {
                                error!("No response from DeepSeek");
                                Ok(self.create_fallback_plan(instruction))
                            }
                        }
                        Err(e) => {
                            error!("Failed to parse DeepSeek response: {}", e);
                            Ok(self.create_fallback_plan(instruction))
                        }
                    }
                } else {
                    error!("DeepSeek API error: {}", response.status());
                    Ok(self.create_fallback_plan(instruction))
                }
            }
            Err(e) => {
                error!("Failed to call DeepSeek: {}", e);
                Ok(self.create_fallback_plan(instruction))
            }
        }
    }

    /// Fallback plan if DeepSeek fails
    fn create_fallback_plan(&self, instruction: &AIInstruction) -> AIExecutionPlan {
        AIExecutionPlan {
            plan_id: format!("plan-{}", Uuid::new_v4()),
            instruction: instruction.instruction.clone(),
            tools_to_call: vec![
                ToolCall {
                    tool_name: "get_status".to_string(),
                    parameters: serde_json::json!({}),
                    description: "Check current VPN status".to_string(),
                    order: 1,
                },
                ToolCall {
                    tool_name: "health_check".to_string(),
                    parameters: serde_json::json!({}),
                    description: "Check system health".to_string(),
                    order: 2,
                },
            ],
            reasoning: "Fallback plan: checking status and health".to_string(),
            estimated_duration_ms: 5000,
            risk_level: "low".to_string(),
        }
    }

    async fn call_deepseek_analysis(
        &self,
        query: String,
        status: serde_json::Value,
    ) -> Result<String, String> {
        info!("Calling DeepSeek for analysis: {}", query);

        let system_prompt = "You are an expert VPN administrator. Answer the user's question based on the current VPN status provided. Be concise and actionable.";

        let user_message = format!(
            "Current VPN Status:\n{}\n\nUser Question: {}",
            serde_json::to_string_pretty(&status).unwrap_or_default(),
            query
        );

        let request = DeepSeekRequest {
            messages: vec![
                DeepSeekMessage {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                DeepSeekMessage {
                    role: "user".to_string(),
                    content: user_message,
                },
            ],
            model: "deepseek-chat".to_string(),
            temperature: 0.5,
            max_tokens: 1000,
        };

        match self
            .http_client
            .post(&self.deepseek_api_url)
            .bearer_auth(&self.deepseek_api_key)
            .json(&request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<DeepSeekResponse>().await {
                        Ok(deepseek_response) => {
                            if let Some(choice) = deepseek_response.choices.first() {
                                info!("DeepSeek analysis completed");
                                Ok(choice.message.content.clone())
                            } else {
                                warn!("No response from DeepSeek analysis");
                                Ok("Unable to analyze status at this time".to_string())
                            }
                        }
                        Err(e) => {
                            error!("Failed to parse DeepSeek analysis: {}", e);
                            Ok(format!("Status: {:?}", status))
                        }
                    }
                } else {
                    error!("DeepSeek analysis API error: {}", response.status());
                    Ok(format!("Status: {:?}", status))
                }
            }
            Err(e) => {
                error!("Failed to call DeepSeek analysis: {}", e);
                Ok(format!("Status: {:?}", status))
            }
        }
    }

    async fn call_deepseek_anomaly_detection(
        &self,
        status: serde_json::Value,
    ) -> Result<Vec<String>, String> {
        info!("Running DeepSeek anomaly detection");

        let system_prompt = r#"You are a VPN security expert. Analyze the VPN status and identify any anomalies or issues.
Respond ONLY with a JSON array of strings, each being a potential issue or suggestion.
Example: ["Issue 1", "Issue 2", "Suggestion 3"]"#;

        let user_message = format!(
            "Analyze this VPN status for anomalies:\n{}",
            serde_json::to_string_pretty(&status).unwrap_or_default()
        );

        let request = DeepSeekRequest {
            messages: vec![
                DeepSeekMessage {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                DeepSeekMessage {
                    role: "user".to_string(),
                    content: user_message,
                },
            ],
            model: "deepseek-chat".to_string(),
            temperature: 0.6,
            max_tokens: 1000,
        };

        match self
            .http_client
            .post(&self.deepseek_api_url)
            .bearer_auth(&self.deepseek_api_key)
            .json(&request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<DeepSeekResponse>().await {
                        Ok(deepseek_response) => {
                            if let Some(choice) = deepseek_response.choices.first() {
                                // Try to parse as JSON array
                                match serde_json::from_str::<Vec<String>>(&choice.message.content) {
                                    Ok(anomalies) => {
                                        info!("Detected {} anomalies", anomalies.len());
                                        Ok(anomalies)
                                    }
                                    Err(_) => {
                                        // Fallback: return the response as a single item
                                        warn!("Could not parse anomalies as JSON array, returning as text");
                                        Ok(vec![choice.message.content.clone()])
                                    }
                                }
                            } else {
                                warn!("No anomalies detected");
                                Ok(vec!["No issues detected".to_string()])
                            }
                        }
                        Err(e) => {
                            error!("Failed to parse anomaly detection response: {}", e);
                            Ok(vec!["Unable to analyze anomalies".to_string()])
                        }
                    }
                } else {
                    error!("Anomaly detection API error: {}", response.status());
                    Ok(vec!["Service unavailable".to_string()])
                }
            }
            Err(e) => {
                error!("Failed to call anomaly detection: {}", e);
                Ok(vec![format!("Detection error: {}", e)])
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_orchestrator_creation() {
        let orchestrator = AIOrchestrator::new(
            "test_key".to_string(),
            "http://localhost:8080".to_string(),
        );

        let instruction = AIInstruction {
            instruction: "Create a new VPN peer for John".to_string(),
            context: None,
            user_id: Some("admin".to_string()),
        };

        let plan = orchestrator.plan_execution(instruction).await;
        assert!(plan.is_ok());
    }
}

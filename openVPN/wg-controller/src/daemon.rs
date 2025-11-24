mod api;
mod wireguard;
mod config;
mod error;
mod temporal_client;
mod deepseek;
mod tools;
mod ai_orchestrator;
mod peer_manager;
mod config_validator;
mod analytics;
mod health_monitor;
mod geolocation;
mod auth;
mod notifications;
mod peer_groups;

use axum::{
    routing::{get, post, delete, put},
    Router,
    extract::{State, Path},
    Json,
    http::{Method, HeaderMap},
    middleware,
};
use std::net::SocketAddr;
use std::sync::Arc;
use log::info;
use temporal_client::TemporalClient;
use deepseek::DeepSeekClient;
use ai_orchestrator::AIOrchestrator;
use peer_manager::PeerManager;
use config_validator::ConfigValidator;
use analytics::AnalyticsEngine;
use health_monitor::HealthMonitor;
use geolocation::GeolocationService;
use auth::AuthService;
use notifications::NotificationService;
use peer_groups::PeerGroupManager;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState {
    temporal_client: Arc<TemporalClient>,
    deepseek_client: Arc<DeepSeekClient>,
    ai_orchestrator: Arc<AIOrchestrator>,
    peer_manager: Arc<tokio::sync::Mutex<PeerManager>>,
    analytics_engine: Arc<AnalyticsEngine>,
    health_monitor: Arc<HealthMonitor>,
    geolocation_service: Arc<GeolocationService>,
    auth_service: Arc<AuthService>,
    notification_service: Arc<NotificationService>,
    peer_group_manager: Arc<PeerGroupManager>,
}

/// CORS middleware to allow cross-origin requests from browsers
async fn cors_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    // Handle OPTIONS preflight requests
    if req.method() == axum::http::Method::OPTIONS {
        let mut response = axum::response::Response::new(axum::body::Body::empty());
        response.headers_mut().insert("Access-Control-Allow-Origin", "*".parse().unwrap());
        response.headers_mut().insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
        response.headers_mut().insert("Access-Control-Allow-Headers", "Content-Type, Authorization".parse().unwrap());
        return response;
    }

    let mut response = next.run(req).await;
    
    let headers = response.headers_mut();
    headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
    headers.insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
    headers.insert("Access-Control-Allow-Headers", "Content-Type, Authorization".parse().unwrap());
    
    response
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkflowResponse {
    workflow_id: String,
    status: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct CreateInterfaceRequest {
    name: String,
    address: String,
    listen_port: u16,
}

#[derive(Debug, Deserialize)]
struct AnalyzeWorkflowRequest {
    workflow_type: String,
    workflow_data: serde_json::Value,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    // Initialize clients
    let temporal_client = Arc::new(TemporalClient::new("localhost:7233".to_string()));
    
    let deepseek_api_key = std::env::var("DEEPSEEK_API_KEY")
        .unwrap_or_else(|_| "demo_key".to_string());
    let deepseek_client = Arc::new(DeepSeekClient::new(deepseek_api_key.clone()));
    
    let ai_orchestrator = Arc::new(AIOrchestrator::new(
        deepseek_api_key,
        "http://127.0.0.1:8080".to_string(),
    ));

    let peer_manager = Arc::new(tokio::sync::Mutex::new(PeerManager::new()?));

    // Initialize new services
    let analytics_engine = Arc::new(AnalyticsEngine::new(10000));
    let health_monitor = Arc::new(HealthMonitor::new(100.0, 5.0)); // 100ms latency, 5% packet loss threshold
    let geolocation_service = Arc::new(GeolocationService::new());
    let auth_service = Arc::new(AuthService::new("your-secret-key-change-me".to_string(), 24));
    let notification_service = Arc::new(NotificationService::new(1000));
    let peer_group_manager = Arc::new(PeerGroupManager::new());

    // Register default admin user (change password immediately)
    let _ = auth_service.register_user(
        "admin".to_string(),
        "admin".to_string(),
        auth::UserRole::Admin,
    ).await;
    
    let state = AppState {
        temporal_client,
        deepseek_client,
        ai_orchestrator,
        peer_manager,
        analytics_engine,
        health_monitor,
        geolocation_service,
        auth_service,
        notification_service,
        peer_group_manager,
    };

    let app = Router::new()
        .route("/health", get(health_check))
        
        // VPN Management APIs
        .route("/api/v1/interfaces", get(list_interfaces))
        .route("/api/v1/interfaces", post(create_interface_workflow))
        .route("/api/v1/interfaces/:name", get(get_interface))
        .route("/api/v1/interfaces/:name", delete(delete_interface))
        .route("/api/v1/interfaces/:name/up", post(start_interface_workflow))
        .route("/api/v1/interfaces/:name/down", post(stop_interface))
        
        // Tool APIs (for AI orchestration)
        .route("/api/tools/peers", post(create_peer_tool))
        .route("/api/tools/peers", get(list_peers_tool))
        .route("/api/tools/peers/:peer_id", delete(delete_peer_tool))
        .route("/api/tools/peers/:peer_id/rotate-keys", post(rotate_keys_tool))
        .route("/api/tools/peers/:peer_id/allowed-ips", post(update_allowed_ips_tool))
        .route("/api/tools/config/validate", post(validate_config_tool))
        .route("/api/tools/config/analyze", post(analyze_config_tool))
        .route("/api/tools/status", get(get_status_tool))
        .route("/api/tools/health-check", get(health_check_tool))
        .route("/api/tools/peers/idle", get(find_idle_peers_tool))
        
        // Workflow APIs
        .route("/api/v1/workflows/:workflow_id", get(get_workflow_status))
        
        // AI Integration APIs
        .route("/api/v1/ai/analyze-workflow", post(analyze_workflow_with_ai))
        .route("/api/v1/ai/optimize-workflow", post(optimize_workflow_with_ai))
        .route("/api/v1/ai/recommend-config", post(recommend_config_with_ai))
        .route("/api/v1/ai/diagnose-issue", post(diagnose_issue_with_ai))
        
        // AI Orchestration APIs
        .route("/api/v1/ai/plan-execution", post(plan_ai_execution))
        .route("/api/v1/ai/execute-plan", post(execute_ai_plan))
        .route("/api/v1/ai/query-status", post(query_status_with_ai))

        // Analytics APIs
        .route("/api/v1/analytics/peer-stats", get(get_peer_stats))
        .route("/api/v1/analytics/bandwidth-history", get(get_bandwidth_history))
        .route("/api/v1/analytics/uptime-stats", get(get_uptime_stats))
        
        // Health Monitoring APIs
        .route("/api/v1/health/network-health", get(get_network_health))
        .route("/api/v1/health/alerts", get(get_health_alerts))
        
        // Geolocation APIs
        .route("/api/v1/geo/peer-locations", get(get_peer_locations))
        .route("/api/v1/geo/peer-location/:peer_id", get(get_peer_location))
        
        // Authentication APIs
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/register", post(register))
        .route("/api/v1/auth/verify", get(verify_token))
        
        // Notification APIs
        .route("/api/v1/notifications", get(get_notifications))
        .route("/api/v1/notifications/unread", get(get_unread_notifications))
        .route("/api/v1/notifications/:id/read", post(mark_notification_read))
        
        // Peer Groups APIs
        .route("/api/v1/groups", get(list_groups))
        .route("/api/v1/groups", post(create_group))
        .route("/api/v1/groups/:group_id", get(get_group))
        .route("/api/v1/groups/:group_id", put(update_group))
        .route("/api/v1/groups/:group_id", delete(delete_group))
        .route("/api/v1/groups/:group_id/peers", post(add_peers_to_group))
        .route("/api/v1/groups/:group_id/peers", delete(remove_peers_from_group))
        .route("/api/v1/peers/:peer_id/metadata", get(get_peer_metadata))
        .route("/api/v1/peers/:peer_id/metadata", post(set_peer_metadata))
        .route("/api/v1/peers/search", get(search_peers))
        
        .layer(middleware::from_fn(cors_middleware))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    info!("🚀 Starting WireGuard daemon with Orchestration + DeepSeek AI on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

async fn list_interfaces() -> &'static str {
    "[]"
}

async fn create_interface_workflow(
    State(state): State<AppState>,
    Json(req): Json<CreateInterfaceRequest>,
) -> Json<WorkflowResponse> {
    info!("Starting VPN provisioning workflow for interface: {}", req.name);

    let input = serde_json::json!({
        "interface_name": req.name.clone(),
        "address": req.address.clone(),
        "listen_port": req.listen_port,
    });

    match state.temporal_client.start_workflow(
        "vpn_provisioning_workflow",
        input,
        "vpn-tasks"
    ).await {
        Ok(execution) => {
            info!("Workflow started: {}", execution.workflow_id);
            Json(WorkflowResponse {
                workflow_id: execution.workflow_id,
                status: "running".to_string(),
                message: "VPN provisioning workflow started".to_string(),
            })
        }
        Err(e) => {
            Json(WorkflowResponse {
                workflow_id: "".to_string(),
                status: "failed".to_string(),
                message: format!("Failed to start workflow: {}", e),
            })
        }
    }
}

async fn get_interface() -> &'static str {
    "{}"
}

async fn delete_interface() -> &'static str {
    "deleted"
}

async fn start_interface_workflow(
    State(state): State<AppState>,
) -> Json<WorkflowResponse> {
    info!("Starting connection management workflow");

    let input = serde_json::json!({
        "interface_name": "wg0",
        "action": "Start"
    });

    match state.temporal_client.start_workflow(
        "connection_management_workflow",
        input,
        "vpn-tasks"
    ).await {
        Ok(execution) => {
            Json(WorkflowResponse {
                workflow_id: execution.workflow_id,
                status: "running".to_string(),
                message: "VPN connection workflow started".to_string(),
            })
        }
        Err(e) => {
            Json(WorkflowResponse {
                workflow_id: "".to_string(),
                status: "failed".to_string(),
                message: format!("Failed to start workflow: {}", e),
            })
        }
    }
}

async fn stop_interface() -> &'static str {
    "stopped"
}

async fn get_workflow_status(
    State(state): State<AppState>,
    axum::extract::Path(workflow_id): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    match state.temporal_client.get_workflow_status(&workflow_id).await {
        Ok(result) => Json(serde_json::json!({
            "workflow_id": result.workflow_id,
            "status": format!("{:?}", result.status),
            "result": result.result,
            "error": result.error,
        })),
        Err(e) => Json(serde_json::json!({
            "error": e,
            "workflow_id": workflow_id,
        }))
    }
}

async fn analyze_workflow_with_ai(
    State(state): State<AppState>,
    Json(req): Json<AnalyzeWorkflowRequest>,
) -> Json<serde_json::Value> {
    info!("Analyzing workflow with DeepSeek AI");

    let request = deepseek::AIAnalysisRequest {
        workflow_type: req.workflow_type,
        workflow_data: req.workflow_data,
        context: "VPN workflow analysis".to_string(),
    };

    match state.deepseek_client.analyze_workflow(request).await {
        Ok(response) => {
            Json(serde_json::json!({
                "analysis": response.analysis,
                "recommendations": response.recommendations,
                "optimization_score": response.optimization_score,
                "insights": response.insights,
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "error": e,
            }))
        }
    }
}

async fn optimize_workflow_with_ai(
    State(state): State<AppState>,
    Json(request): Json<deepseek::AIOptimizationRequest>,
) -> Json<serde_json::Value> {
    info!("Optimizing workflow with DeepSeek AI");

    match state.deepseek_client.optimize_workflow(request).await {
        Ok(suggestions) => {
            Json(serde_json::json!({
                "suggestions": suggestions,
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "error": e,
            }))
        }
    }
}

async fn recommend_config_with_ai(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Getting config recommendations from DeepSeek AI");

    let current_config = request.get("current_config").cloned().unwrap_or_default();
    let use_case = request
        .get("use_case")
        .and_then(|v| v.as_str())
        .unwrap_or("general");

    match state.deepseek_client.recommend_configuration(current_config, use_case).await {
        Ok(recommendations) => {
            Json(serde_json::json!({
                "recommendations": recommendations,
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "error": e,
            }))
        }
    }
}

async fn diagnose_issue_with_ai(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Diagnosing VPN issue with DeepSeek AI");

    let error_log = request
        .get("error_log")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown error");

    let workflow_state = request.get("workflow_state").cloned().unwrap_or_default();

    match state.deepseek_client.diagnose_issue(error_log.to_string(), workflow_state).await {
        Ok(diagnosis) => {
            Json(serde_json::json!({
                "diagnosis": diagnosis,
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "error": e,
            }))
        }
    }
}

// ============================================================================
// TOOL APIS - Atomic operations that DeepSeek AI can orchestrate
// ============================================================================

async fn create_peer_tool(
    State(state): State<AppState>,
    Json(req): Json<tools::CreatePeerRequest>,
) -> Json<tools::CreatePeerResponse> {
    info!("Tool API: Create peer");
    
    let mgr = state.peer_manager.lock().await;
    match mgr.create_peer(
        req.peer_name,
        req.allowed_ips,
        req.endpoint,
        req.persistent_keepalive,
    ).await {
        Ok(response) => Json(response),
        Err(e) => Json(tools::CreatePeerResponse {
            peer_id: "".to_string(),
            public_key: "".to_string(),
            private_key: "".to_string(),
            allowed_ips: "".to_string(),
            status: format!("error: {}", e),
        }),
    }
}

async fn list_peers_tool(
    State(state): State<AppState>,
) -> Json<tools::ListPeersResponse> {
    info!("Tool API: List peers");
    
    let mgr = state.peer_manager.lock().await;
    match mgr.list_peers("wg0").await {
        Ok(peers) => {
            let total = peers.len();
            Json(tools::ListPeersResponse { peers, total })
        }
        Err(_) => Json(tools::ListPeersResponse {
            peers: vec![],
            total: 0,
        }),
    }
}

async fn delete_peer_tool(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
) -> Json<tools::DeletePeerResponse> {
    info!("Tool API: Delete peer {}", peer_id);
    
    let mgr = state.peer_manager.lock().await;
    match mgr.delete_peer("wg0", peer_id.clone()).await {
        Ok(response) => Json(response),
        Err(e) => Json(tools::DeletePeerResponse {
            peer_id,
            status: format!("error: {}", e),
        }),
    }
}

async fn rotate_keys_tool(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
) -> Json<tools::RotateKeysResponse> {
    info!("Tool API: Rotate keys for peer {}", peer_id);
    
    let mgr = state.peer_manager.lock().await;
    match mgr.rotate_peer_keys("wg0", peer_id.clone()).await {
        Ok((old_key, new_key, new_private)) => {
            Json(tools::RotateKeysResponse {
                peer_id,
                old_public_key: old_key,
                new_public_key: new_key,
                new_private_key: new_private,
                status: "success".to_string(),
            })
        }
        Err(e) => Json(tools::RotateKeysResponse {
            peer_id,
            old_public_key: "".to_string(),
            new_public_key: "".to_string(),
            new_private_key: "".to_string(),
            status: format!("error: {}", e),
        }),
    }
}

async fn update_allowed_ips_tool(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<tools::UpdateAllowedIPsResponse> {
    info!("Tool API: Update allowed IPs for peer {}", peer_id);
    
    let new_ips = req
        .get("allowed_ips")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mgr = state.peer_manager.lock().await;
    match mgr.update_allowed_ips("wg0", peer_id.clone(), new_ips.clone()).await {
        Ok(_) => {
            Json(tools::UpdateAllowedIPsResponse {
                peer_id,
                old_ips: "".to_string(),
                new_ips,
                status: "success".to_string(),
            })
        }
        Err(e) => Json(tools::UpdateAllowedIPsResponse {
            peer_id,
            old_ips: "".to_string(),
            new_ips: "".to_string(),
            status: format!("error: {}", e),
        }),
    }
}

async fn validate_config_tool(
    State(_state): State<AppState>,
    Json(req): Json<tools::ValidateConfigRequest>,
) -> Json<tools::ValidateConfigResponse> {
    info!("Tool API: Validate config");
    
    Json(ConfigValidator::validate_config(&req.config_content))
}

async fn analyze_config_tool(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Tool API: Analyze config");
    
    let config = req
        .get("config")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    match ConfigValidator::analyze_config(config, "wg0") {
        Ok(analysis) => Json(serde_json::to_value(analysis).unwrap_or_default()),
        Err(e) => Json(serde_json::json!({ "error": format!("{}", e) })),
    }
}

async fn get_status_tool(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    info!("Tool API: Get status");
    
    // Return mock status for now
    Json(serde_json::json!({
        "interface_name": "wg0",
        "status": "up",
        "address": "10.0.0.1",
        "listen_port": 51820,
        "public_key": "...",
        "peers_count": 0,
        "bytes_in": 0,
        "bytes_out": 0,
        "uptime_seconds": 0,
        "peers": []
    }))
}

async fn health_check_tool(
    State(_state): State<AppState>,
) -> Json<tools::HealthCheckResponse> {
    info!("Tool API: Health check");
    
    Json(tools::HealthCheckResponse {
        healthy: true,
        status: "all systems operational".to_string(),
        timestamp: chrono::Local::now().timestamp(),
        issues: vec![],
        metrics: tools::HealthMetrics {
            interface_up: true,
            has_peers: false,
            recent_handshakes: 0,
            error_count: 0,
            last_error: None,
        },
    })
}

async fn find_idle_peers_tool(
    State(state): State<AppState>,
) -> Json<tools::ListPeersResponse> {
    info!("Tool API: Find idle peers");
    
    let mgr = state.peer_manager.lock().await;
    match mgr.find_idle_peers("wg0", 24).await {
        Ok(peers) => {
            let total = peers.len();
            Json(tools::ListPeersResponse { peers, total })
        }
        Err(_) => Json(tools::ListPeersResponse {
            peers: vec![],
            total: 0,
        }),
    }
}

// ============================================================================
// AI ORCHESTRATION APIS
// ============================================================================

async fn plan_ai_execution(
    State(state): State<AppState>,
    Json(req): Json<ai_orchestrator::AIInstruction>,
) -> Json<ai_orchestrator::AIExecutionPlan> {
    info!("Planning AI execution for: {}", req.instruction);
    
    match state.ai_orchestrator.plan_execution(req).await {
        Ok(plan) => Json(plan),
        Err(e) => Json(ai_orchestrator::AIExecutionPlan {
            plan_id: "".to_string(),
            instruction: "".to_string(),
            tools_to_call: vec![],
            reasoning: format!("Error: {}", e),
            estimated_duration_ms: 0,
            risk_level: "high".to_string(),
        }),
    }
}

async fn execute_ai_plan(
    State(state): State<AppState>,
    Json(plan): Json<ai_orchestrator::AIExecutionPlan>,
) -> Json<ai_orchestrator::ExecutionResult> {
    info!("Executing AI plan: {}", plan.plan_id);
    
    match state.ai_orchestrator.execute_plan(plan).await {
        Ok(result) => Json(result),
        Err(e) => Json(ai_orchestrator::ExecutionResult {
            plan_id: "".to_string(),
            status: "failed".to_string(),
            tool_results: vec![],
            summary: format!("Execution failed: {}", e),
        }),
    }
}

async fn query_status_with_ai(
    State(state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Querying status with AI");
    
    let query = req
        .get("query")
        .and_then(|v| v.as_str())
        .unwrap_or("What is the current VPN status?")
        .to_string();

    match state.ai_orchestrator.query_status(query).await {
        Ok(response) => {
            Json(serde_json::json!({
                "response": response,
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "error": e,
            }))
        }
    }
}

// ==================== Analytics Handlers ====================

async fn get_peer_stats(
    State(state): State<AppState>,
) -> Json<Vec<analytics::PeerStats>> {
    let stats = state.analytics_engine.get_all_peer_stats().await;
    Json(stats)
}

async fn get_bandwidth_history(
    State(state): State<AppState>,
) -> Json<Vec<analytics::BandwidthSnapshot>> {
    let history = state.analytics_engine.get_bandwidth_history(100).await;
    Json(history)
}

async fn get_uptime_stats(
    State(state): State<AppState>,
) -> Json<analytics::UptimeStats> {
    let stats = state.analytics_engine.get_uptime_stats().await;
    Json(stats)
}

// ==================== Health Monitoring Handlers ====================

async fn get_network_health(
    State(state): State<AppState>,
) -> Json<health_monitor::NetworkHealth> {
    let health = state.health_monitor.get_network_health().await;
    Json(health)
}

async fn get_health_alerts(
    State(state): State<AppState>,
) -> Json<Vec<health_monitor::HealthAlert>> {
    let alerts = state.health_monitor.get_recent_alerts(50).await;
    Json(alerts)
}

// ==================== Geolocation Handlers ====================

async fn get_peer_locations(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Peer locations endpoint",
        "cache_size": state.geolocation_service.get_cache_size().await
    }))
}

async fn get_peer_location(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "peer_id": peer_id,
        "message": "Get specific peer location"
    }))
}

// ==================== Authentication Handlers ====================

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<auth::LoginRequest>,
) -> Json<serde_json::Value> {
    match state.auth_service.authenticate(&payload.username, &payload.password).await {
        Ok(token) => {
            Json(serde_json::json!({
                "success": true,
                "token": token,
                "username": payload.username
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<auth::RegisterRequest>,
) -> Json<serde_json::Value> {
    let role = match payload.role.as_str() {
        "admin" => auth::UserRole::Admin,
        "operator" => auth::UserRole::Operator,
        _ => auth::UserRole::Viewer,
    };

    match state.auth_service.register_user(payload.username.clone(), payload.password, role).await {
        Ok(_) => {
            Json(serde_json::json!({
                "success": true,
                "username": payload.username
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

async fn verify_token(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Token verification endpoint"
    }))
}

// ==================== Notification Handlers ====================

async fn get_notifications(
    State(state): State<AppState>,
) -> Json<Vec<notifications::Notification>> {
    let notifs = state.notification_service.get_notifications(50).await;
    Json(notifs)
}

async fn get_unread_notifications(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let unread = state.notification_service.get_unread_notifications().await;
    let count = state.notification_service.get_unread_count().await;
    Json(serde_json::json!({
        "count": count,
        "notifications": unread
    }))
}

async fn mark_notification_read(
    State(state): State<AppState>,
    Path(notification_id): Path<String>,
) -> Json<serde_json::Value> {
    match state.notification_service.mark_as_read(&notification_id).await {
        Ok(_) => {
            Json(serde_json::json!({
                "success": true,
                "notification_id": notification_id
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

// ==================== Peer Groups Handlers ====================

async fn list_groups(
    State(state): State<AppState>,
) -> Json<Vec<peer_groups::PeerGroup>> {
    let groups = state.peer_group_manager.get_all_groups().await;
    Json(groups)
}

async fn create_group(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let name = payload["name"].as_str().unwrap_or("New Group").to_string();
    let description = payload["description"].as_str().unwrap_or("").to_string();
    let color = payload["color"].as_str().unwrap_or("#667eea").to_string();

    match state.peer_group_manager.create_group(name, description, color).await {
        Ok(group) => Json(serde_json::to_value(group).unwrap()),
        Err(e) => {
            Json(serde_json::json!({
                "error": e
            }))
        }
    }
}

async fn get_group(
    State(state): State<AppState>,
    Path(group_id): Path<String>,
) -> Json<serde_json::Value> {
    match state.peer_group_manager.get_group(&group_id).await {
        Some(group) => Json(serde_json::to_value(group).unwrap()),
        None => {
            Json(serde_json::json!({
                "error": "Group not found"
            }))
        }
    }
}

async fn update_group(
    State(state): State<AppState>,
    Path(group_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let name = payload["name"].as_str().map(|s| s.to_string());
    let description = payload["description"].as_str().map(|s| s.to_string());

    match state.peer_group_manager.update_group(&group_id, name, description, None).await {
        Ok(group) => Json(serde_json::to_value(group).unwrap()),
        Err(e) => {
            Json(serde_json::json!({
                "error": e
            }))
        }
    }
}

async fn delete_group(
    State(state): State<AppState>,
    Path(group_id): Path<String>,
) -> Json<serde_json::Value> {
    match state.peer_group_manager.delete_group(&group_id).await {
        Ok(_) => {
            Json(serde_json::json!({
                "success": true
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

async fn add_peers_to_group(
    State(state): State<AppState>,
    Path(group_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let peer_ids: Vec<String> = payload["peer_ids"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();

    match state.peer_group_manager.add_peers_to_group(&group_id, peer_ids).await {
        Ok(_) => {
            Json(serde_json::json!({
                "success": true
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

async fn remove_peers_from_group(
    State(state): State<AppState>,
    Path(group_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let peer_ids: Vec<String> = payload["peer_ids"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();

    match state.peer_group_manager.remove_peers_from_group(&group_id, peer_ids).await {
        Ok(_) => {
            Json(serde_json::json!({
                "success": true
            }))
        }
        Err(e) => {
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
    }
}

async fn get_peer_metadata(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
) -> Json<serde_json::Value> {
    match state.peer_group_manager.get_peer_metadata(&peer_id).await {
        Some(metadata) => Json(serde_json::to_value(metadata).unwrap()),
        None => {
            Json(serde_json::json!({
                "error": "Peer metadata not found"
            }))
        }
    }
}

async fn set_peer_metadata(
    State(state): State<AppState>,
    Path(peer_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let display_name = payload["display_name"].as_str().unwrap_or("").to_string();
    let description = payload["description"].as_str().unwrap_or("").to_string();

    match state.peer_group_manager.set_peer_metadata(peer_id, display_name, description).await {
        Ok(metadata) => Json(serde_json::to_value(metadata).unwrap()),
        Err(e) => {
            Json(serde_json::json!({
                "error": e
            }))
        }
    }
}

async fn search_peers(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<Vec<peer_groups::PeerMetadata>> {
    let query = params.get("q").unwrap_or(&String::new()).clone();
    let results = state.peer_group_manager.search_peers(&query).await;
    Json(results)
}

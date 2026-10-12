#!/usr/bin/env python3
"""
欧洲儿童陪护机器人 - 完整系统 v1.0
European Children Companion Robot - Complete System

基于文档《欧洲儿童陪护机器人技术架构完善方案》构建
"""

import time as _start_time_import
_START_TIME = _start_time_import.time()

import os
import signal
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from datetime import datetime
import asyncio
import json
import random

# Load .env if available
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / "project_source" / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    env_path_local = Path(__file__).parent / ".env"
    if env_path_local.exists():
        load_dotenv(env_path_local)
except ImportError:
    pass

# ==================== 导入功能模块 ====================
from children_conversation import SmartConversationSystem, conversation_system
from children_education import EducationSkillSystem, education_system
from children_entertainment import EntertainmentSkillSystem, entertainment as entertainment_system
from children_emotional import EmotionalCompanionSystem, emotional_system
from children_learning import LearningManagementSystem, learning_system
from children_growth import GrowthRecordSystem, growth_system
from children_device import DeviceControlSystem, device_control
from children_admin import AdminManagementSystem, admin_system
from children_data_sync import DataSyncSystem, data_sync
from children_security import SecurityComplianceSystem, security
from children_langchain import LangChainIntegration, langchain_integration
from children_langgraph import LangGraphWorkflow, langgraph_workflow
from children_edge_ai import EdgeAIManager, edge_ai, create_edge_ai_router
from children_recommend import RecommendationEngine, recommendation_engine
from children_config import settings
from children_analytics import analytics
from children_search import search_engine
from children_age_gate import AgeGateMiddleware, create_vpc_router
from children_dpp import create_dpp_router
from children_coppa import create_coppa_router
from children_dsa import create_dsa_router
from children_lti import create_lti_router
from children_classroom import create_classroom_router
from children_gdpr_sharing import create_gdpr_sharing_router
from children_pricing import pricing_engine, create_pricing_router
from children_order_routing import order_router, create_order_routing_router
from children_crm import crm, create_crm_router
from children_rma import rma_service, create_rma_router
from children_logistics import logistics, create_logistics_router
from children_data_loop import data_loop, create_data_loop_router
from children_self_learning import self_learning, create_self_learning_router
from children_self_evolution import evolution, create_evolution_router
from children_content_officer import content_officer, create_content_officer_router
from children_payment import payment_gateway, create_payment_router
from children_engagement import engagement, create_engagement_router
from children_integrations import hub as integration_hub, create_integrations_router
from children_subscription import subscription_engine, create_subscription_router
from children_content_quality import content_quality, create_content_quality_router
from children_support import support, create_support_router
from children_live_adapters import configure_live_adapters, create_live_adapters_router
from children_referral import referral, create_referral_router
from children_experiment import engine, create_experiment_router
from children_revenue_planner import planner as revenue_planner, create_revenue_planner_router
from children_growth_execution import engine as growth_engine, create_growth_execution_router

# ==================== 配置 ====================
BASE_DIR = Path(__file__).parent
# Honour $PORT so any PaaS (Render/Fly/Railway/Heroku) can inject its own port.
PORT = int(os.getenv("PORT", "8888"))

# ==================== 速率限制 ====================
from collections import defaultdict
import asyncio as _asyncio
import time as _rate_time

# In-memory fast path rate limiting
_rate_limit_store: Dict[str, list] = defaultdict(list)
_rate_limit_config = {"max_requests": 120, "window_seconds": 60}

def check_rate_limit(client_ip: str) -> bool:
    now = _rate_time.time()
    window = _rate_limit_config["window_seconds"]
    max_req = _rate_limit_config["max_requests"]
    timestamps = _rate_limit_store[client_ip]
    cutoff = now - window
    _rate_limit_store[client_ip] = [t for t in timestamps if t > cutoff]
    if len(_rate_limit_store[client_ip]) >= max_req:
        return False
    _rate_limit_store[client_ip].append(now)
    return True

def check_rate_limit_persistent(client_ip: str) -> bool:
    try:
        from children_persistence import rate_limit_check
        return rate_limit_check(client_ip, _rate_limit_config["max_requests"], _rate_limit_config["window_seconds"])
    except Exception:
        return check_rate_limit(client_ip)

# ==================== 创建FastAPI应用 ====================
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="欧洲儿童陪护机器人",
    description="European Children Companion Robot System - Education, Growth, Emotional & Security",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

CORS_ORIGINS = os.getenv("ROBOT_CORS_ORIGINS", "*")
_ALLOWED_ORIGINS = CORS_ORIGINS.split(",") if CORS_ORIGINS != "*" else ["*"]
_CORS_CREDENTIALS = _ALLOWED_ORIGINS != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=_CORS_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Age Gate (GDPR-K Art. 8) - must be after CORS, before auth middleware
app.add_middleware(AgeGateMiddleware)

# Mount VPC router
vpc_router = create_vpc_router()
app.include_router(vpc_router)

# Mount DPP router (Toy Safety Regulation)
dpp_router = create_dpp_router()
app.include_router(dpp_router)

# Mount Edge AI router (on-device inference)
edge_ai_router = create_edge_ai_router()
app.include_router(edge_ai_router)

# Mount COPPA router (US Children's Privacy)
coppa_router = create_coppa_router()
app.include_router(coppa_router)

# Mount DSA router (EU Digital Services Act)
dsa_router = create_dsa_router()
app.include_router(dsa_router)

# Mount LTI 1.3 router (LMS Integration)
lti_router = create_lti_router()
app.include_router(lti_router)

# Mount Google Classroom router
classroom_router = create_classroom_router()
app.include_router(classroom_router)

# Mount GDPR Data Sharing router
gdpr_sharing_router = create_gdpr_sharing_router()
app.include_router(gdpr_sharing_router)

# Mount 16-step commerce workflow routers
app.include_router(create_pricing_router())          # 4  定价
app.include_router(create_order_routing_router())    # 5  订单路由
app.include_router(create_payment_router())          # 6  支付
app.include_router(create_logistics_router())        # 7  物流
app.include_router(create_rma_router())              # 8/16 售后/RMA
app.include_router(create_crm_router())              # 9/10 外联/跟进
app.include_router(create_data_loop_router())        # 11 数据闭环
app.include_router(create_self_learning_router())    # 13 自学习
app.include_router(create_evolution_router())        # 14 自进化
app.include_router(create_content_officer_router())  # 15 内容官
app.include_router(create_engagement_router())      # 产品侧留存环（粘性）
app.include_router(create_integrations_router())    # 证据通道：GitHub/企微/钉钉
app.include_router(create_subscription_router())    # 订阅管理：计费/催收/升降级
app.include_router(create_content_quality_router()) # 内容质量闭环：评分→重写队列
app.include_router(create_support_router())         # 客服工单闭环：SLA/CSAT/知识库
app.include_router(create_live_adapters_router())   # 真实适配器状态 / Stripe-Shippo webhook
app.include_router(create_referral_router())        # 推荐分佣闭环
app.include_router(create_experiment_router())      # A/B 实验闭环
app.include_router(create_revenue_planner_router()) # 营收目标闭环（日需 -> 每日必须量）
app.include_router(create_growth_execution_router())# 增长落地闭环（上架/铺货/爬坡/每日清单）

# Hidden autonomous-ops backend: mounted ONLY when ENABLE_HIDDEN_API=true and
# AUTONOMOUS_INTERNAL_KEY is set. Never appears in OpenAPI (include_in_schema=False).
try:
    from children_autonomous_ops import mount_autonomous_ops, start_background_loop
    if mount_autonomous_ops(app):
        print("  [hidden] autonomous-ops API mounted (internal key required)")
except Exception as _autonomous_exc:  # never break the app if it is disabled/broken
    print(f"  [hidden] autonomous-ops not mounted: {_autonomous_exc}")


# ==================== 启动事件 ====================
@app.on_event("startup")
async def startup_event():
    routes = [r.path for r in app.routes]
    api_routes = [r for r in routes if r.startswith("/api")]
    print(f"  Total routes: {len(routes)} ({len(api_routes)} API endpoints)")
    from children_persistence import init_sqlite_db, run_migrations
    try:
        init_sqlite_db()
        run_migrations()
        print("  SQLite database initialized + migrations applied")
    except Exception:
        print("  SQLite initialization skipped")
    load_system_state()

    from children_auth import register_user
    from children_database import database as _auth_db
    for u in [("admin", "admin123", "admin"), ("parent1", "parent123", "parent"), ("child1", "child123", "child")]:
        existing = _auth_db.fetchone("SELECT user_id FROM users WHERE name=?", (u[0],))
        if not existing:
            register_user(u[0], u[1], u[2])

    from children_content_db import get_all_content
    content = get_all_content()
    search_engine.reindex(content)
    print(f"  Search index rebuilt: {len(content.get('quiz_database',{}))} quiz sets, "
          f"{len(content.get('kindergarten_courses',{}))+len(content.get('primary_courses',{}))+len(content.get('middle_school_courses',{}))} courses")

    from children_scheduler import scheduler
    asyncio.create_task(scheduler.start())
    print(f"  Scheduler started: {len(scheduler._tasks)} tasks")

    # Hidden 24/7 autonomous loop (only when AUTONOMOUS_AUTOSTART=1)
    try:
        from children_autonomous_ops import start_background_loop
        if await start_background_loop():
            print("  [hidden] autonomous 24/7 loop started")
    except Exception as _autonomous_loop_exc:
        print(f"  [hidden] autonomous loop not started: {_autonomous_loop_exc}")

@app.on_event("shutdown")
async def shutdown_event():
    _logger.info("Shutting down — stopping scheduler")
    try:
        from children_autonomous_ops import stop_background_loop
        await stop_background_loop()
    except Exception:
        pass
    try:
        from children_scheduler import scheduler
        scheduler.stop()
        _logger.info("Scheduler stopped")
    except Exception:
        pass
    _logger.info("Saving system state")
    save_system_state()
    _logger.info("Closing database connections")
    try:
        from children_persistence import _pool_initialized, _pool_lock, _pool
        if _pool_initialized:
            import queue
            while True:
                try:
                    conn = _pool.get_nowait()
                    conn.close()
                except queue.Empty:
                    break
            _logger.info("Database pool connections closed")
    except Exception:
        pass
    _logger.info("Shutdown complete")


# ==================== API版本支持 ====================
API_VERSIONS = {"1.0.0", "1.1.0", "2.0.0"}
API_CURRENT_VERSION = "2.0.0"

_version_handlers: Dict[str, Dict[str, Dict[str, callable]]] = {}

def api_version(version: str = "2.0.0", methods: list = None):
    """Decorator: register a route handler for a specific API version."""
    def decorator(func):
        import functools
        path = getattr(func, "_version_path", None) or f"/api/{func.__name__.replace('_', '/')}"
        for m in (methods or ["GET"]):
            _version_handlers.setdefault(path, {}).setdefault(version, {})[m] = func
        setattr(func, "_version_registered", True)
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def resolve_api_version(request: Request) -> str:
    version = request.headers.get("X-API-Version", API_CURRENT_VERSION)
    return version if version in API_VERSIONS else API_CURRENT_VERSION

# ==================== 中间件 ====================
import uuid as _uuid
import time as _time
import logging as _logging
import json as _json
from pythonjsonlogger import jsonlogger

# Structured JSON logging
_log_handler = _logging.StreamHandler()
_log_handler.setFormatter(jsonlogger.JsonFormatter(
    "%(asctime)s %(levelname)s %(name)s %(message)s",
    rename_fields={"levelname": "level", "asctime": "timestamp"}
))
_logging.basicConfig(level=_logging.INFO, handlers=[_log_handler])
_logger = _logging.getLogger("robot")

# CSP header (production only)
_is_prod = os.getenv("ROBOT_STAGE", "development") == "production"
_CSP_HEADER = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' wss:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
) if _is_prod else None

# ==================== RBAC 策略 ====================
# Sensitive prefixes require a valid JWT with at least the given role.
# Set ROBOT_AUTH_ENFORCED=0 to disable enforcement (e.g. local demos).
_RBAC_PROTECTED = (
    ("/api/admin", "admin"),
    ("/api/audit", "admin"),
)

def _rbac_enforced() -> bool:
    return os.getenv("ROBOT_AUTH_ENFORCED", "1") not in ("0", "false", "False")

def _enforce_rbac(request: Request):
    """Return a JSONResponse (401/403) when a protected route is called
    without sufficient credentials, else None."""
    if not _rbac_enforced():
        return None
    path = request.url.path
    needed = None
    for prefix, role in _RBAC_PROTECTED:
        if path == prefix or path.startswith(prefix + "/"):
            needed = role
            break
    if not needed:
        return None
    from children_auth import parse_auth_header, require_role
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload:
        return JSONResponse(status_code=401, content={"code": 401, "error": "Authentication required"})
    if not require_role(payload, needed):
        return JSONResponse(status_code=403, content={"code": 403, "error": "Forbidden"})
    return None

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(_uuid.uuid4()))
    start = _time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    # Bind correlation_id to logger context
    _logger = _logging.getLogger("robot")
    _logger = _logging.LoggerAdapter(_logger, {"correlation_id": correlation_id, "client_ip": client_ip})
    
    if not check_rate_limit(client_ip) and "/api/" in request.url.path:
        _logger.warning("Rate limit exceeded", extra={"path": request.url.path})
        return JSONResponse(status_code=429, content={"code": 429, "error": "Too many requests", "retry_after": 60})
    try:
        # Input validation: reject oversized request bodies
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:
            return JSONResponse(status_code=413, content={"code": 413, "error": "Request too large"})
        # Validate content-type for mutating requests
        if request.method in ("POST", "PUT", "PATCH") and "/api/" in request.url.path:
            ct = request.headers.get("content-type", "")
            if ct and "application/json" not in ct and "multipart/form-data" not in ct and "x-www-form-urlencoded" not in ct:
                return JSONResponse(status_code=415, content={"code": 415, "error": "Unsupported media type"})

        # Authorization gate for protected (admin/audit) routes
        denied = _enforce_rbac(request)
        if denied is not None:
            return denied

        response = await call_next(request)
        elapsed = _time.time() - start
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = str(round(elapsed * 1000))
        response.headers["X-RateLimit-Limit"] = str(_rate_limit_config["max_requests"])
        response.headers["X-API-Version"] = API_CURRENT_VERSION
        
        # Security headers
        if _CSP_HEADER:
            response.headers["Content-Security-Policy"] = _CSP_HEADER
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        if elapsed > 1.0:
            _logger.warning("Slow request", extra={"method": request.method, "path": request.url.path, "duration_ms": round(elapsed*1000)})

        # Request audit logging
        if "/api/" in request.url.path and request.method in ("POST", "PUT", "DELETE", "PATCH"):
            try:
                from children_database import database as _audit_db
                _audit_db.log_audit(
                    correlation_id, f"{request.method} {request.url.path}",
                    str(request.url.path), f"{elapsed*1000:.0f}ms", client_ip
                )
            except Exception:
                pass
        
        _logger.info("Request completed", extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(elapsed*1000)
        })
        return response
    except Exception as e:
        elapsed = _time.time() - start
        _logger.error("Request failed", extra={
            "method": request.method,
            "path": request.url.path,
            "duration_ms": round(elapsed*1000),
            "error": str(e)[:200]
        })
        return JSONResponse(
            status_code=500,
            content={"code": 500, "error": str(e)[:200], "path": str(request.url.path), "correlation_id": correlation_id}
        )


# ==================== 全局异常处理 ====================
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"code": 422, "error": "Validation failed", "details": exc.errors(), "path": str(request.url.path)}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    _logger.error(f"Unhandled error: {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "error": "Internal server error",
            "message": str(exc)[:200] if os.getenv("ROBOT_DEBUG") else "An unexpected error occurred",
            "path": str(request.url.path)
        }
    )


# ==================== 系统健康检查 ====================
@app.get("/health")
@app.get("/api/health")
async def health_check():
    import sys as _sys
    return {
        "status": "healthy", "version": "1.0.0", "timestamp": datetime.now().isoformat(),
        "uptime_seconds": int(_start_time_import.time() - _START_TIME),
        "modules_loaded": 14,
        "python_version": _sys.version
    }

@app.get("/health/live")
async def health_live():
    """Kubernetes liveness probe - returns 200 if process is alive."""
    return {"status": "alive"}

@app.get("/health/ready")
async def health_ready():
    """Kubernetes readiness probe - returns 200 if ready to serve traffic."""
    # Check critical dependencies
    checks = {}
    all_healthy = True
    
    # Database
    try:
        from children_persistence import _get_conn
        conn = _get_conn()
        conn.execute("SELECT 1")
        from children_persistence import _put_conn
        _put_conn(conn)
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        all_healthy = False
    
    # Redis (if configured)
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_connect_timeout=2)
            r.ping()
            checks["redis"] = "ok"
        except Exception as e:
            checks["redis"] = f"error: {e}"
            all_healthy = False
    else:
        checks["redis"] = "not configured"
    
    status_code = 200 if all_healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if all_healthy else "not ready", "checks": checks, "timestamp": datetime.now().isoformat()}
    )


# ==================== API信息 ====================
@app.get("/api/info")
async def api_info():
    routes = sorted(set(r.path for r in app.routes if hasattr(r, 'path') and not r.path.startswith('/console')))
    api_routes = [r for r in routes if r.startswith("/api")]
    return {
        "name": "欧洲儿童陪护机器人 API", "version": "1.0.0",
        "total_routes": len(routes), "api_routes": len(api_routes),
        "routes": routes
    }


# ==================== 静态文件和模板 ====================
FRONTEND_DIST = BASE_DIR / "project_source" / "management_center" / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    import os as _os

    # Serve static assets directly
    app.mount("/console/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="console_assets")

    # Serve index.html for all /console/ paths (SPA fallback)
    index_path = str(FRONTEND_DIST / "index.html")

    @app.get("/console/")
    @app.get("/console/{path:path}")
    async def serve_console(path: str = ""):
        return FileResponse(index_path, media_type="text/html")

    print(f"  React frontend mounted at /console (from {FRONTEND_DIST})")

# ==================== 页面路由 ====================
@app.get("/", response_class=HTMLResponse)
async def home():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 40px;
                max-width: 1200px;
                width: 100%;
            }
            h1 {
                color: #667eea;
                text-align: center;
                margin-bottom: 30px;
                font-size: 2.5em;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 40px;
                font-size: 1.2em;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-decoration: none;
                transition: transform 0.3s, box-shadow 0.3s;
            }
            .card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            }
            .card h3 { margin-bottom: 10px; font-size: 1.3em; }
            .card p { opacity: 0.9; font-size: 0.9em; }
            .status {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }
            .status-item {
                display: inline-block;
                margin: 10px 20px;
            }
            .status-label { color: #666; }
            .status-value { color: #667eea; font-weight: bold; font-size: 1.2em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 欧洲儿童陪护机器人</h1>
            <p class="subtitle">European Children Companion Robot System v1.0</p>
            
            <div class="status">
                <div class="status-item">
                    <div class="status-label">系统状态</div>
                    <div class="status-value">✅ 运行中</div>
                </div>
                <div class="status-item">
                    <div class="status-label">在线设备</div>
                    <div class="status-value">3 台</div>
                </div>
                <div class="status-item">
                    <div class="status-label">活跃用户</div>
                    <div class="status-value">12 人</div>
                </div>
                <div class="status-item">
                    <div class="status-label">今日对话</div>
                    <div class="status-value">156 次</div>
                </div>
            </div>
            
            <h2 style="margin: 30px 0 20px; color: #333;">快速访问</h2>
            <div class="grid">
                <a href="/robot" class="card">
                    <h3>🤖 机器人端</h3>
                    <p>机器人控制台 - 设备监控、技能管理、语音交互</p>
                </a>
                <a href="/parent-app" class="card">
                    <h3>📱 家长端APP</h3>
                    <p>家长控制台 - 设备管理、学习监督、成长记录</p>
                </a>
                <a href="/admin" class="card">
                    <h3>⚙️ 管理中心</h3>
                    <p>系统管理 - 用户管理、设备管理、数据分析</p>
                </a>
                <a href="/learning" class="card">
                    <h3>📚 学习中心</h3>
                    <p>学习管理 - 课程安排、进度跟踪、成绩分析</p>
                </a>
                <a href="/growth" class="card">
                    <h3>🌱 成长记录</h3>
                    <p>成长档案 - 成就展示、技能解锁、习惯打卡</p>
                </a>
                <a href="/emotional" class="card">
                    <h3>💝 情感陪伴</h3>
                    <p>情感支持 - 心理陪伴、情绪识别、习惯培养</p>
                </a>
                <a href="/entertainment" class="card">
                    <h3>🎮 娱乐中心</h3>
                    <p>娱乐互动 - 故事播放、音乐欣赏、游戏互动</p>
                </a>
                <a href="/api/docs" class="card">
                    <h3>📖 API文档</h3>
                    <p>接口文档 - RESTful API、实时通信、WebSocket</p>
                </a>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/robot", response_class=HTMLResponse)
async def robot_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>机器人端 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #f5576c;
                text-align: center;
                margin-bottom: 20px;
            }
            .robot-display {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            .display-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 15px;
            }
            .display-card h3 { margin-bottom: 10px; }
            .status-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .status-item {
                background: rgba(255, 255, 255, 0.2);
                padding: 10px;
                border-radius: 8px;
                text-align: center;
            }
            .status-value { font-size: 1.5em; font-weight: bold; }
            .status-label { font-size: 0.8em; opacity: 0.9; }
            .conversation-area {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 20px;
                height: 300px;
                overflow-y: auto;
            }
            .message {
                margin-bottom: 15px;
                padding: 10px 15px;
                border-radius: 10px;
                max-width: 70%;
            }
            .message.user { background: #667eea; color: white; margin-left: auto; }
            .message.robot { background: #f5576c; color: white; }
            .input-area {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .input-area input {
                flex: 1;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 16px;
            }
            .input-area button {
                padding: 15px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
            }
            .input-area button:hover { opacity: 0.9; }
            .skills-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-top: 20px;
            }
            .skill-btn {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 15px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                transition: transform 0.2s;
            }
            .skill-btn:hover { transform: scale(1.05); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 机器人端控制台</h1>
            
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;justify-content:center">
                <a href="http://localhost:3000/learning-center.html" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;transition:transform 0.2s">📚 学习中心</a>
                <a href="http://localhost:3000/smart-agent.html" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;transition:transform 0.2s">🤖 AI聊天</a>
                <a href="https://github.com/78/xiaozhi-esp32" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;transition:transform 0.2s">🔧 小智ESP32</a>
            </div>
            
            <div class="robot-display">
                <div class="display-card">
                    <h3>📊 设备状态</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <div class="status-value">98%</div>
                            <div class="status-label">电量</div>
                        </div>
                        <div class="status-item">
                            <div class="status-value">正常</div>
                            <div class="status-label">网络</div>
                        </div>
                        <div class="status-item">
                            <div class="status-value">36°C</div>
                            <div class="status-label">温度</div>
                        </div>
                        <div class="status-item">
                            <div class="status-value">在线</div>
                            <div class="status-label">状态</div>
                        </div>
                        <div class="status-item">
                            <div class="status-value">2.1GB</div>
                            <div class="status-label">存储</div>
                        </div>
                        <div class="status-item">
                            <div class="status-value">1.2GB</div>
                            <div class="status-label">内存</div>
                        </div>
                    </div>
                </div>
                
                <div class="display-card">
                    <h3>🎯 当前模式</h3>
                    <div style="text-align: center; padding: 30px 0;">
                        <div style="font-size: 3em;">📚</div>
                        <div style="font-size: 1.5em; font-weight: bold;">学习模式</div>
                        <div style="opacity: 0.9;">已运行 45 分钟</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="skill-btn" style="flex: 1;">📚 学习</button>
                        <button class="skill-btn" style="flex: 1;">🎮 娱乐</button>
                        <button class="skill-btn" style="flex: 1;">💤 休息</button>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px; color: #333;">💬 智能对话</h3>
            <div class="conversation-area" id="conversation">
                <div class="message robot">
                    <strong>小乐：</strong>你好呀！我是你的好朋友小乐，今天想学什么呢？
                </div>
            </div>
            
            <div class="input-area">
                <input type="text" id="userInput" placeholder="请说话或输入文字..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">发送</button>
            </div>
            
            <h3 style="margin: 20px 0 15px; color: #333;">🧩 技能快捷入口</h3>
            <div class="skills-grid">
                <button class="skill-btn" onclick="quickChat('讲个故事')">📖 讲故事</button>
                <button class="skill-btn" onclick="quickChat('唱首歌')">🎵 唱首歌</button>
                <button class="skill-btn" onclick="quickChat('学数学')">🔢 学数学</button>
                <button class="skill-btn" onclick="quickChat('帮我写作业')">📝 写作业</button>
                <button class="skill-btn" onclick="quickChat('学英语')">🌍 学英语</button>
                <button class="skill-btn" onclick="quickChat('画画')">🎨 画画画</button>
                <button class="skill-btn" onclick="quickChat('做实验')">🧪 做实验</button>
                <button class="skill-btn" onclick="quickChat('做运动')">🏃 做运动</button>
            </div>
        </div>
        
        <script>
            async function callChatAPI(message) {
                const resp = await fetch('/api/conversation/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'child_001', message: message, mode: 'free'})
                });
                return await resp.json();
            }

            function addMessage(role, text) {
                const conv = document.getElementById('conversation');
                const msg = document.createElement('div');
                msg.className = 'message ' + role;
                const label = role === 'user' ? '我' : '小乐';
                msg.innerHTML = '<strong>' + label + '：</strong>' + text.replace(/\\n/g, '<br>');
                conv.appendChild(msg);
                conv.scrollTop = conv.scrollHeight;
            }

            async function sendMessage() {
                const input = document.getElementById('userInput');
                const message = input.value.trim();
                if (!message) return;
                
                addMessage('user', message);
                input.value = '';
                input.disabled = true;
                
                try {
                    const data = await callChatAPI(message);
                    const reply = data.data?.reply || data.data?.message || data.data?.response || JSON.stringify(data.data);
                    addMessage('robot', reply);
                } catch(e) {
                    addMessage('robot', '🤖 网络连接失败，请稍后再试');
                }
                input.disabled = false;
                input.focus();
            }

            function quickChat(text) {
                document.getElementById('userInput').value = text;
                sendMessage();
            }

            // Load conversation history
            async function loadHistory() {
                try {
                    const resp = await fetch('/api/conversation/history/child_001');
                    const data = await resp.json();
                    if (data.data?.messages) {
                        const conv = document.getElementById('conversation');
                        conv.innerHTML = '';
                        data.data.messages.forEach(m => {
                            addMessage(m.role === 'user' ? 'user' : 'robot', m.content);
                        });
                    }
                } catch(e) { /* use default welcome */ }
            }
            loadHistory();
                }, 1000);
            }
            
            function startVoice() {
                alert('语音识别已启动，请说话...');
            }
            
            document.getElementById('userInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendMessage();
            });
        </script>
    </body>
    </html>
    """

@app.get("/parent-app", response_class=HTMLResponse)
async def parent_app_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>家长端 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #00f2fe;
                text-align: center;
                margin-bottom: 20px;
            }
            .dashboard {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
            }
            .stat-value { font-size: 2.5em; font-weight: bold; }
            .stat-label { font-size: 0.9em; opacity: 0.9; }
            .section {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .section h3 { color: #333; margin-bottom: 15px; }
            .progress-bar {
                background: #e0e0e0;
                border-radius: 10px;
                height: 20px;
                margin-bottom: 10px;
            }
            .progress-fill {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                border-radius: 10px;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.8em;
            }
            .action-btn {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                margin-right: 10px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>👨‍👩‍👧 家长端控制台</h1>
            
            <div class="dashboard">
                <div class="stat-card">
                    <div class="stat-value">45</div>
                    <div class="stat-label">今日学习(分钟)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">92%</div>
                    <div class="stat-label">正确率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">3</div>
                    <div class="stat-label">完成作业</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">😊</div>
                    <div class="stat-label">情绪状态</div>
                </div>
            </div>
            
            <div class="section">
                <h3>📚 今日学习进度</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 75%;">75%</div>
                </div>
                <p style="color: #666; font-size: 0.9em;">已学习 45 分钟，剩余 15 分钟</p>
            </div>
            
            <div class="section">
                <h3>🤖 设备控制</h3>
                <button class="action-btn">📖 切换学习模式</button>
                <button class="action-btn">🎮 切换娱乐模式</button>
                <button class="action-btn">💤 切换休息模式</button>
                <button class="action-btn">📊 查看设备状态</button>
                <button class="action-btn">⚙️ 设备设置</button>
            </div>
            
            <div class="section">
                <h3>👶 孩子信息</h3>
                <p><strong>姓名：</strong>小明</p>
                <p><strong>年龄：</strong>8岁</p>
                <p><strong>年级：</strong>小学二年级</p>
                <p><strong>绑定设备：</strong>机器人-001</p>
            </div>
            
            <div class="section">
                <h3>📈 成长数据</h3>
                <button class="action-btn">📊 查看学习报告</button>
                <button class="action-btn">🏆 查看成就</button>
                <button class="action-btn">📅 查看打卡记录</button>
                <button class="action-btn">📷 查看相册</button>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理中心 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #fa709a;
                text-align: center;
                margin-bottom: 20px;
            }
            .admin-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }
            .admin-card {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.3s;
            }
            .admin-card:hover { transform: translateY(-5px); }
            .admin-icon { font-size: 3em; margin-bottom: 10px; }
            .admin-title { font-size: 1.2em; font-weight: bold; margin-bottom: 5px; }
            .admin-desc { font-size: 0.9em; opacity: 0.9; }
            .stats-row {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 15px;
                margin: 30px 0;
            }
            .stat-box {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }
            .stat-number { font-size: 2em; color: #fa709a; font-weight: bold; }
            .stat-name { color: #666; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚙️ 管理中心</h1>
            
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-number">1,234</div>
                    <div class="stat-name">注册用户</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">456</div>
                    <div class="stat-name">在线设备</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">78</div>
                    <div class="stat-name">今日活跃</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">12.5K</div>
                    <div class="stat-name">总对话数</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">99.9%</div>
                    <div class="stat-name">系统可用</div>
                </div>
            </div>
            
            <div class="admin-grid">
                <div class="admin-card">
                    <div class="admin-icon">👥</div>
                    <div class="admin-title">用户管理</div>
                    <div class="admin-desc">用户注册、权限分配、行为监控</div>
                </div>
                <div class="admin-card">
                    <div class="admin-icon">🤖</div>
                    <div class="admin-title">设备管理</div>
                    <div class="admin-desc">设备监控、远程运维、配置下发</div>
                </div>
                <div class="admin-card">
                    <div class="admin-icon">📊</div>
                    <div class="admin-title">数据分析</div>
                    <div class="admin-desc">用户行为、内容消费、运营统计</div>
                </div>
                <div class="admin-card">
                    <div class="admin-icon">📚</div>
                    <div class="admin-title">内容管理</div>
                    <div class="admin-desc">教育资源更新、版本控制、灰度发布</div>
                </div>
                <div class="admin-card">
                    <div class="admin-icon">🔧</div>
                    <div class="admin-title">系统配置</div>
                    <div class="admin-desc">系统参数、功能开关、阈值配置</div>
                </div>
                <div class="admin-card">
                    <div class="admin-icon">🛡️</div>
                    <div class="admin-title">安全管理</div>
                    <div class="admin-desc">权限控制、审计日志、安全策略</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/learning", response_class=HTMLResponse)
async def learning_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>学习中心 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #a8edea;
                text-align: center;
                margin-bottom: 20px;
            }
            .course-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            .course-card {
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                padding: 20px;
                border-radius: 15px;
                color: white;
                text-align: center;
            }
            .course-icon { font-size: 3em; margin-bottom: 10px; }
            .course-title { font-weight: bold; margin-bottom: 5px; }
            .course-progress { background: rgba(255,255,255,0.3); border-radius: 10px; height: 10px; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📚 学习中心</h1>
            <div class="course-grid">
                <div class="course-card">
                    <div class="course-icon">🔢</div>
                    <div class="course-title">数学</div>
                    <p>进度: 65%</p>
                    <div class="course-progress"></div>
                </div>
                <div class="course-card">
                    <div class="course-icon">🌍</div>
                    <div class="course-title">英语</div>
                    <p>进度: 80%</p>
                    <div class="course-progress" style="width: 80%"></div>
                </div>
                <div class="course-card">
                    <div class="course-icon">📝</div>
                    <div class="course-title">语文</div>
                    <p>进度: 45%</p>
                    <div class="course-progress" style="width: 45%"></div>
                </div>
                <div class="course-card">
                    <div class="course-icon">🔬</div>
                    <div class="course-title">科学</div>
                    <p>进度: 30%</p>
                    <div class="course-progress" style="width: 30%"></div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/growth", response_class=HTMLResponse)
async def growth_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>成长记录 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #96e6a1;
                text-align: center;
                margin-bottom: 20px;
            }
            .achievement-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 15px;
            }
            .achievement {
                background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                color: white;
            }
            .achievement-icon { font-size: 2em; }
            .achievement-name { font-size: 0.9em; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌱 成长记录</h1>
            <div class="achievement-grid">
                <div class="achievement"><div class="achievement-icon">🏆</div><div class="achievement-name">学习之星</div></div>
                <div class="achievement"><div class="achievement-icon">📚</div><div class="achievement-name">阅读达人</div></div>
                <div class="achievement"><div class="achievement-icon">🎨</div><div class="achievement-name">创意小画家</div></div>
                <div class="achievement"><div class="achievement-icon">🏃</div><div class="achievement-name">运动健将</div></div>
                <div class="achievement"><div class="achievement-icon">🎵</div><div class="achievement-name">音乐天才</div></div>
                <div class="achievement"><div class="achievement-icon">🌟</div><div class="achievement-name">全能小冠军</div></div>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/emotional", response_class=HTMLResponse)
async def emotional_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>情感陪伴 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #ff9a9e;
                text-align: center;
                margin-bottom: 20px;
            }
            .emotion-status {
                text-align: center;
                padding: 40px;
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                border-radius: 15px;
                color: white;
                margin-bottom: 20px;
            }
            .emotion-emoji { font-size: 5em; }
            .emotion-text { font-size: 1.5em; margin-top: 10px; }
            .companion-btn {
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                margin: 5px;
                cursor: pointer;
                font-size: 16px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>💝 情感陪伴</h1>
            <div class="emotion-status">
                <div class="emotion-emoji">😊</div>
                <div class="emotion-text">开心快乐</div>
            </div>
            <div style="text-align: center;">
                <button class="companion-btn">💬 和我聊天</button>
                <button class="companion-btn">🎵 播放舒缓音乐</button>
                <button class="companion-btn">📖 讲个故事</button>
                <button class="companion-btn">🧘 做放松练习</button>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/entertainment", response_class=HTMLResponse)
async def entertainment_page():
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>娱乐中心 - 欧洲儿童陪护机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 1400px;
                margin: 0 auto;
            }
            h1 {
                color: #a18cd1;
                text-align: center;
                margin-bottom: 20px;
            }
            .entertainment-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            .entertainment-card {
                background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                color: white;
                cursor: pointer;
                transition: transform 0.3s;
            }
            .entertainment-card:hover { transform: scale(1.05); }
            .entertainment-icon { font-size: 3em; margin-bottom: 10px; }
            .entertainment-title { font-size: 1.2em; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎮 娱乐中心</h1>
            <div class="entertainment-grid">
                <div class="entertainment-card">
                    <div class="entertainment-icon">📖</div>
                    <div class="entertainment-title">讲故事</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎵</div>
                    <div class="entertainment-title">听音乐</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎬</div>
                    <div class="entertainment-title">看动画</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎮</div>
                    <div class="entertainment-title">玩游戏</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎨</div>
                    <div class="entertainment-title">学唱歌</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🕺</div>
                    <div class="entertainment-title">跳舞</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎭</div>
                    <div class="entertainment-title">角色扮演</div>
                </div>
                <div class="entertainment-card">
                    <div class="entertainment-icon">🎯</div>
                    <div class="entertainment-title">互动问答</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


# ==================== SEO / Robots ====================
@app.get("/robots.txt")
async def robots_txt():
    return HTMLResponse("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: http://localhost:8888/sitemap.xml")


@app.get("/sitemap.xml")
async def sitemap():
    return HTMLResponse("""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://localhost:8888/</loc><priority>1.0</priority></url>
  <url><loc>http://localhost:8888/robot</loc><priority>0.9</priority></url>
  <url><loc>http://localhost:8888/parent-app</loc><priority>0.8</priority></url>
  <url><loc>http://localhost:8888/admin</loc><priority>0.7</priority></url>
  <url><loc>http://localhost:8888/learning</loc><priority>0.8</priority></url>
  <url><loc>http://localhost:8888/growth</loc><priority>0.7</priority></url>
  <url><loc>http://localhost:8888/emotional</loc><priority>0.8</priority></url>
  <url><loc>http://localhost:8888/entertainment</loc><priority>0.7</priority></url>
</urlset>""", media_type="application/xml")


# ==================== Ping ====================
@app.get("/api/ping")
async def ping():
    return {"pong": True, "timestamp": datetime.now().isoformat()}


# ==================== WebSocket实时推送 ====================
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.device_connections: Dict[str, WebSocket] = {}
        self._broadcast_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, client_id: str = "anonymous"):
        await websocket.accept()
        self.active_connections.setdefault(client_id, []).append(websocket)
        return client_id

    async def connect_device(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        self.device_connections[device_id] = websocket
        self.active_connections.setdefault(f"device:{device_id}", []).append(websocket)
        return device_id

    def disconnect(self, websocket: WebSocket, client_id: str = "anonymous"):
        if client_id in self.active_connections:
            try:
                self.active_connections[client_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        for did, ws in list(self.device_connections.items()):
            if ws == websocket:
                del self.device_connections[did]
                break

    async def send_personal(self, message: dict, client_id: str):
        for ws in self.active_connections.get(client_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast(self, message: dict):
        disconnected = []
        for cid, connections in self.active_connections.items():
            for ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append((cid, ws))
        for cid, ws in disconnected:
            self.disconnect(ws, cid)

    async def send_to_device(self, device_id: str, message: dict):
        ws = self.device_connections.get(device_id)
        if ws:
            try:
                await ws.send_json(message)
                return True
            except Exception:
                self.disconnect(ws, f"device:{device_id}")
        return False

    def start_telemetry_broadcast(self):
        if self._broadcast_task is None or self._broadcast_task.done():
            self._broadcast_task = asyncio.create_task(self._telemetry_loop())

    async def _telemetry_loop(self):
        while True:
            try:
                telemetry = {
                    "type": "telemetry",
                    "timestamp": datetime.now().isoformat(),
                    "system": {
                        "uptime": round(time.time() - _START_TIME, 1),
                        "active_sessions": len(conversation_system.sessions),
                        "enrollments": len(learning_system.enrollments),
                        "achievements": len(growth_system.achievements),
                        "devices_online": len(self.device_connections),
                        "websocket_clients": sum(len(v) for v in self.active_connections.values()),
                    },
                    "robot": device_control.get_all_status() if hasattr(device_control, 'get_all_status') else {},
                    "memory_mb": 0
                }
                await self.broadcast(telemetry)
            except Exception:
                pass
            await asyncio.sleep(5)

ws_manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "anonymous"):
    await ws_manager.connect(websocket, client_id)
    ws_manager.start_telemetry_broadcast()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                elif msg_type == "subscribe":
                    topic = msg.get("topic", "")
                    await websocket.send_json({"type": "subscribed", "topic": topic})
                elif msg_type == "command":
                    target = msg.get("target", "")
                    command = msg.get("command", {})
                    if target and command:
                        if hasattr(device_control, 'remote_control'):
                            device_control.remote_control(target, command)
                        await websocket.send_json({"type": "command_ack", "target": target, "status": "sent"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, client_id)

@app.websocket("/ws/device/{device_id}")
async def device_websocket_endpoint(websocket: WebSocket, device_id: str):
    await ws_manager.connect_device(websocket, device_id)
    ws_manager.start_telemetry_broadcast()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")
                if msg_type == "telemetry":
                    await ws_manager.broadcast({
                        "type": "device_telemetry",
                        "device_id": device_id,
                        "data": msg.get("data", {}),
                        "timestamp": datetime.now().isoformat()
                    })
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, f"device:{device_id}")

@app.get("/api/ws/stats")
async def websocket_stats():
    return JSONResponse({
        "code": 200,
        "data": {
            "active_clients": sum(len(v) for v in ws_manager.active_connections.values()),
            "devices_connected": len(ws_manager.device_connections),
            "client_detail": {k: len(v) for k, v in ws_manager.active_connections.items()}
        }
    })

# ==================== API端点 ====================

# -------------------- 智能对话系统API --------------------
@app.post("/api/conversation/chat")
async def chat(request: Request):
    data = await request.json()
    result = conversation_system.process_message(
        data.get('user_id', ''),
        data.get('message', ''),
        session_id=data.get('session_id'),
        mode=data.get('mode', 'free')
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/conversation/history/{session_id}")
async def get_conversation_history(session_id: str):
    history = conversation_system.get_session(session_id)
    return JSONResponse({"code": 200, "data": history})

@app.get("/api/conversation/sessions/{user_id}")
async def list_conversation_sessions(user_id: str):
    """List all conversation sessions for a user."""
    sessions = conversation_system.get_user_sessions(user_id)
    return JSONResponse({"code": 200, "data": {"sessions": sessions, "count": len(sessions)}})

@app.delete("/api/conversation/session/{session_id}")
async def delete_conversation_session(request: Request, session_id: str):
    """Delete a conversation session (any authenticated user)."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload:
        return JSONResponse({"code": 401, "data": {"error": "Unauthorized"}}, status_code=401)
    result = conversation_system.delete_session(session_id)
    return JSONResponse({"code": 200, "data": result})

# -------------------- 教育技能系统API --------------------
@app.get("/api/education/skills")
async def get_education_skills():
    skills = education_system.get_all_skills()
    return JSONResponse({"code": 200, "data": skills})

@app.post("/api/education/execute")
async def execute_education_skill(request: Request):
    data = await request.json()
    result = education_system.execute_skill(
        data.get('skill_name', ''),
        data.get('params', {}),
        data.get('user_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/education/progress/{user_id}")
async def get_learning_progress(user_id: str):
    progress = education_system.get_progress(user_id)
    return JSONResponse({"code": 200, "data": progress})

# -------------------- 娱乐技能系统API --------------------
@app.get("/api/entertainment/skills")
async def get_entertainment_skills(page: int = 1, page_size: int = 25):
    skills = entertainment_system.get_paginated_content(page=page, page_size=page_size)
    return JSONResponse({"code": 200, "data": skills})

@app.post("/api/entertainment/play")
async def play_entertainment(request: Request):
    data = await request.json()
    result = entertainment_system.play_content(
        data.get('content_id', ''),
        data.get('user_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

# -------------------- 情感陪伴系统API --------------------
@app.post("/api/emotional/analyze")
async def analyze_emotion(request: Request):
    data = await request.json()
    result = emotional_system.analyze_emotion(
        data.get('text', ''),
        data.get('user_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/emotional/companion")
async def emotional_companion(request: Request):
    data = await request.json()
    result = emotional_system.provide_companion(
        data.get('user_id', ''),
        data.get('emotion_type', ''),
        data.get('message', '')
    )
    return JSONResponse({"code": 200, "data": result})

# -------------------- 学习管理系统API --------------------
@app.post("/api/learning/enroll")
async def start_learning(request: Request):
    data = await request.json()
    result = learning_system.enroll(
        data.get('user_id', ''),
        data.get('course_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/learning/report/{user_id}")
async def get_learning_report(user_id: str):
    report = learning_system.get_report(user_id)
    return JSONResponse({"code": 200, "data": report})

# -------------------- 成长记录系统API --------------------
@app.get("/api/growth/achievements/{user_id}")
async def get_achievements(user_id: str):
    achievements = growth_system.get_achievements(user_id)
    return JSONResponse({"code": 200, "data": achievements})

@app.post("/api/growth/unlock")
async def unlock_achievement(request: Request):
    data = await request.json()
    result = growth_system.check_and_unlock(
        data.get('user_id', ''),
        data.get('event', {'type': 'achievement', 'data': {}})
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/growth/timeline/{user_id}")
async def get_growth_timeline(user_id: str):
    timeline = growth_system.get_timeline(user_id)
    return JSONResponse({"code": 200, "data": timeline})

# -------------------- 设备控制系统API --------------------
@app.get("/api/device/{device_id}/status")
async def get_device_status(device_id: str):
    status = device_control.get_device_detail(device_id)
    return JSONResponse({"code": 200, "data": status})

@app.post("/api/device/{device_id}/control")
async def control_device(request: Request, device_id: str):
    data = await request.json()
    result = device_control.execute_command(
        device_id,
        data.get('command', ''),
        data.get('params', {})
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/device")
async def list_devices(request: Request):
    """List all registered devices (any authenticated user)."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload:
        return JSONResponse({"code": 401, "data": {"error": "Unauthorized"}}, status_code=401)
    owner = request.query_params.get("owner_id")
    devices = device_control.get_devices(owner)
    return JSONResponse({"code": 200, "data": {"devices": devices, "count": len(devices)}})

@app.post("/api/device/register")
async def register_device(request: Request):
    """Register a new robot device (parent or admin only)."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload or not require_role(payload, "parent"):
        return JSONResponse({"code": 403, "data": {"error": "Forbidden"}}, status_code=403)
    data = await request.json()
    result = device_control.register_device(
        data.get('device_id', ''),
        data.get('name', ''),
        data.get('type', 'robot'),
        data.get('owner_id', payload.get('sub', ''))
    )
    return JSONResponse({"code": 200, "data": result})

@app.delete("/api/device/{device_id}")
async def unregister_device(request: Request, device_id: str):
    """Remove a device (parent or admin only)."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload or not require_role(payload, "parent"):
        return JSONResponse({"code": 403, "data": {"error": "Forbidden"}}, status_code=403)
    result = device_control.unregister_device(device_id)
    return JSONResponse({"code": 200, "data": result})

# -------------------- 管理中心API --------------------
@app.get("/api/admin/stats")
async def get_admin_stats():
    stats = admin_system.get_statistics()
    return JSONResponse({"code": 200, "data": stats})

@app.get("/api/admin/devices")
async def get_all_devices():
    devices = admin_system.get_devices_overview()
    return JSONResponse({"code": 200, "data": devices})

# -------------------- 数据同步系统API --------------------
@app.post("/api/sync/push")
async def push_data(request: Request):
    data = await request.json()
    result = data_sync.push(
        data.get('device_id', ''),
        data.get('data_type', ''),
        data.get('data', {})
    )
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/sync/pull")
async def pull_data(request: Request):
    data = await request.json()
    result = data_sync.pull(
        data.get('device_id', ''),
        data.get('data_type', '')
    )
    return JSONResponse({"code": 200, "data": result})

# -------------------- 安全合规系统API --------------------
@app.post("/api/security/verify")
async def verify_security(request: Request):
    data = await request.json()
    result = security.verify_request(
        data.get('token', ''),
        data.get('action', ''),
        "api"
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/security/compliance")
async def get_compliance_status():
    status = security.get_security_status()
    return JSONResponse({"code": 200, "data": status})

# -------------------- 教育测验API --------------------
@app.get("/api/education/quiz/{skill_id}")
async def get_quiz(skill_id: str, count: int = 3):
    result = education_system.get_quiz(skill_id, count)
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/education/quiz/submit")
async def submit_quiz(request: Request):
    data = await request.json()
    result = education_system.submit_quiz(
        data.get('skill_id', ''),
        data.get('user_id', ''),
        data.get('answers', {})
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/education/skills/category/{category}")
async def get_skills_by_category(category: str):
    skills = education_system.get_skills_by_category(category)
    return JSONResponse({"code": 200, "data": skills})

# -------------------- 娱乐系统扩展API --------------------
@app.post("/api/entertainment/quiz/answer")
async def submit_entertainment_quiz(request: Request):
    data = await request.json()
    result = entertainment_system.submit_quiz_answer(
        data.get('content_id', ''),
        data.get('user_id', ''),
        data.get('answers', {})
    )
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/entertainment/favorite")
async def toggle_favorite(request: Request):
    data = await request.json()
    result = entertainment_system.toggle_favorite(
        data.get('user_id', ''),
        data.get('content_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/entertainment/queue/add")
async def add_to_queue(request: Request):
    data = await request.json()
    result = entertainment_system.add_to_queue(
        data.get('user_id', ''),
        data.get('content_id', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/entertainment/queue/{user_id}")
async def get_queue(user_id: str):
    queue = entertainment_system.get_queue(user_id)
    return JSONResponse({"code": 200, "data": queue})

@app.get("/api/entertainment/recommendations/{user_id}")
async def get_recommendations(user_id: str, count: int = 5):
    recs = entertainment_system.get_recommendations(user_id, count)
    return JSONResponse({"code": 200, "data": recs})

@app.get("/api/entertainment/search")
async def search_content(query: str):
    results = entertainment_system.search(query)
    return JSONResponse({"code": 200, "data": results})

# -------------------- 学习管理系统扩展API --------------------
@app.get("/api/learning/courses")
async def get_courses_subject(subject: str = None):
    courses = learning_system.get_courses(subject)
    return JSONResponse({"code": 200, "data": courses})

@app.get("/api/learning/performance/{user_id}/{subject}")
async def get_subject_performance(user_id: str, subject: str):
    perf = learning_system.get_subject_performance(user_id, subject)
    return JSONResponse({"code": 200, "data": perf})

# -------------------- 成长记录系统扩展API --------------------
@app.get("/api/growth/leaderboard")
async def get_leaderboard():
    board = growth_system.get_leaderboard()
    return JSONResponse({"code": 200, "data": board})

@app.get("/api/growth/goals/{user_id}")
async def get_next_goals(user_id: str):
    goals = growth_system.get_next_goals(user_id)
    return JSONResponse({"code": 200, "data": goals})

# -------------------- 设备控制扩展API --------------------
@app.get("/api/device/{device_id}/logs")
async def get_device_logs(device_id: str, limit: int = 20):
    logs = device_control.get_device_logs(device_id, limit)
    return JSONResponse({"code": 200, "data": logs})

# -------------------- 管理中心扩展API --------------------
@app.post("/api/admin/users")
async def create_user(request: Request):
    data = await request.json()
    result = admin_system.create_user(
        data.get('user_id', ''),
        data.get('name', ''),
        data.get('age', 0),
        data.get('role', 'child'),
        data.get('parent_id')
    )
    return JSONResponse({"code": 200, "data": result})

@app.put("/api/admin/users/{user_id}")
async def update_user(user_id: str, request: Request):
    data = await request.json()
    result = admin_system.update_user(user_id, data)
    return JSONResponse({"code": 200, "data": result})

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: str):
    result = admin_system.delete_user(user_id)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/admin/users")
async def get_users(role: str = None, search: str = None, page: int = 1, page_size: int = 25):
    users = admin_system.get_users(role, search, page, page_size)
    return JSONResponse({"code": 200, "data": users})

@app.get("/api/admin/system-health")
async def get_system_health():
    health = admin_system.get_system_health()
    return JSONResponse({"code": 200, "data": health})

@app.get("/api/admin/usage-report")
async def get_usage_report(start_date: str = None, end_date: str = None):
    report = admin_system.get_usage_report(start_date, end_date)
    return JSONResponse({"code": 200, "data": report})

@app.get("/api/admin/content-analytics")
async def get_content_analytics():
    analytics = admin_system.get_content_analytics()
    return JSONResponse({"code": 200, "data": analytics})

# -------------------- 数据同步系统扩展API --------------------
@app.post("/api/sync/now")
async def sync_now():
    result = data_sync.sync_now()
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/sync/delta")
async def get_delta(request: Request):
    data = await request.json()
    delta = data_sync.get_delta(
        data.get('device_id', ''),
        data.get('data_type', ''),
        data.get('since_version', 0)
    )
    return JSONResponse({"code": 200, "data": delta})

@app.get("/api/sync/conflicts")
async def list_conflicts():
    try:
        conflicts = data_sync.list_conflicts()
    except AttributeError:
        conflicts = []
    return JSONResponse({"code": 200, "data": conflicts})

# -------------------- 安全合规扩展API --------------------
@app.post("/api/security/register-token")
async def register_token(request: Request):
    data = await request.json()
    token = security.register_token(
        data.get('user_id', ''),
        data.get('role', 'child')
    )
    return JSONResponse({"code": 200, "data": {"token": token}})

@app.post("/api/security/register-device-token")
async def register_device_token(request: Request):
    data = await request.json()
    token = security.register_device_token(data.get('device_id', ''))
    return JSONResponse({"code": 200, "data": {"token": token}})

@app.get("/api/security/compliance/{framework}")
async def check_compliance(framework: str):
    result = security.check_compliance(framework)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/security/privacy-report/{user_id}")
async def generate_privacy_report(user_id: str):
    report = security.generate_privacy_report(user_id)
    return JSONResponse({"code": 200, "data": report})

@app.get("/api/security/audit-log")
async def get_audit_log(limit: int = 50):
    log = security.get_audit_log(limit)
    return JSONResponse({"code": 200, "data": log})

# -------------------- 边缘AI系统API --------------------
@app.get("/api/edge-ai/models")
async def get_edge_models():
    models = edge_ai.get_models()
    return JSONResponse({"code": 200, "data": models})

@app.post("/api/edge-ai/models/enable")
async def enable_edge_model(request: Request):
    data = await request.json()
    result = edge_ai.enable_model(
        data.get('model_id', ''),
        data.get('enabled', True)
    )
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/edge-ai/stats")
async def get_edge_stats(model_id: str = None):
    stats = edge_ai.get_inference_stats(model_id)
    return JSONResponse({"code": 200, "data": stats})

# -------------------- LangChain系统API --------------------
@app.get("/api/langchain/models")
async def get_langchain_models():
    models = langchain_integration.get_available_models()
    return JSONResponse({"code": 200, "data": models})

@app.post("/api/langchain/cache/clear")
async def clear_langchain_cache():
    langchain_integration.clear_cache()
    return JSONResponse({"code": 200, "data": {"status": "cache cleared"}})

@app.post("/api/langchain/chain")
async def run_langchain_chain(request: Request):
    data = await request.json()
    result = langchain_integration.create_chain(
        data.get('template', ''),
        data.get('params', {}),
        model=data.get('model')
    )
    return JSONResponse({"code": 200, "data": result})

# -------------------- LangGraph工作流API --------------------
@app.get("/api/langgraph/workflows")
async def get_all_workflows():
    workflows = langgraph_workflow.get_all_workflows()
    return JSONResponse({"code": 200, "data": workflows})

@app.post("/api/langgraph/workflows")
async def create_workflow(request: Request):
    data = await request.json()
    result = langgraph_workflow.create_workflow(
        data.get('workflow_id', ''),
        data.get('name', ''),
        data.get('description', ''),
        data.get('nodes', []),
        data.get('start_node', '')
    )
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/langgraph/workflows/execute")
async def execute_workflow(request: Request):
    data = await request.json()
    result = langgraph_workflow.execute_workflow(
        data.get('workflow_id', ''),
        data.get('context', {}),
        data.get('max_steps', 50)
    )
    return JSONResponse({"code": 200, "data": result})

# -------------------- 阶段化内容API (育儿园/小学/中学) --------------------
@app.get("/api/stages")
async def get_all_stages():
    from children_content_db import STAGES
    return JSONResponse({"code": 200, "data": [
        {"id": sid, "name": s["name"], "name_en": s["name_en"],
         "age_range": s["age_range"], "sub_stages": s["sub_stages"],
         "subjects": s["subjects"]}
        for sid, s in STAGES.items()
    ]})

@app.get("/api/stages/{stage}/courses")
async def get_stage_courses(stage: str, grade: str = None, page: int = 1, page_size: int = 25):
    courses = learning_system.get_paginated_courses(stage, grade, page, page_size)
    return JSONResponse({"code": 200, "data": courses})

@app.get("/api/stages/{stage}/lessons/{course_id}")
async def get_stage_lessons(stage: str, course_id: str):
    result = learning_system.get_stage_lesson(stage, course_id)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/stages/{stage}/lesson/{course_id}/{lesson_id}")
async def get_stage_lesson_detail(stage: str, course_id: str, lesson_id: str):
    result = learning_system.get_stage_lesson(stage, course_id, lesson_id)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/stages/{stage}/quiz")
async def get_stage_quiz(stage: str, subject: str = None, page: int = 1, page_size: int = 25):
    result = education_system.get_paginated_quiz(stage, subject, page, page_size)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/stages/{stage}/entertainment")
async def get_stage_entertainment(stage: str, page: int = 1, page_size: int = 25):
    content = entertainment_system.get_paginated_content(stage, page, page_size)
    return JSONResponse({"code": 200, "data": content})

@app.get("/api/stages/{stage}/achievements")
async def get_stage_achievements(stage: str):
    achievements = growth_system.get_achievements_by_stage(stage)
    return JSONResponse({"code": 200, "data": achievements})

@app.get("/api/stages/summary")
async def get_stages_summary():
    from children_content_db import get_stage_summary
    learning_summary = learning_system.get_stage_summary()
    entertainment_summary = entertainment_system.get_stage_summary()
    growth_summary = growth_system.get_stage_achievements_summary()
    return JSONResponse({"code": 200, "data": {
        "content": get_stage_summary(),
        "achievements": growth_summary
    }})

# ==================== 推荐引擎 ====================
from children_recommend import recommendation_engine

@app.post("/api/recommend/build-profile")
async def api_build_profile(request: Request):
    body = await request.json()
    uid = body.get("user_id", "unknown")
    profile = recommendation_engine.build_profile(
        uid,
        learning_records=body.get("learning_records"),
        education_progress=body.get("education_progress"),
        emotion_history=body.get("emotion_history"),
        growth_data=body.get("growth_data"),
    )
    return JSONResponse({"code": 200, "data": profile})

@app.get("/api/recommend/courses/{user_id}")
async def api_recommend_courses(user_id: str, top_n: int = 5):
    courses = recommendation_engine.recommend_courses(user_id, top_n)
    return JSONResponse({"code": 200, "data": courses})

@app.get("/api/recommend/activities/{user_id}")
async def api_recommend_activities(user_id: str, top_n: int = 3):
    activities = recommendation_engine.recommend_activities(user_id, top_n)
    return JSONResponse({"code": 200, "data": activities})

@app.get("/api/recommend/quizzes/{user_id}")
async def api_recommend_quizzes(user_id: str, top_n: int = 5):
    quizzes = recommendation_engine.recommend_quizzes(user_id, top_n)
    return JSONResponse({"code": 200, "data": quizzes})

@app.get("/api/recommend/all/{user_id}")
async def api_recommend_all(user_id: str):
    result = recommendation_engine.recommend_all(user_id)
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/recommend/cache/invalidate")
async def api_invalidate_cache(request: Request):
    body = await request.json()
    uid = body.get("user_id")
    recommendation_engine.invalidate_cache(uid)
    return JSONResponse({"code": 200, "message": "Cache invalidated"})

# ==================== 分析引擎 ====================
from children_analytics import analytics

@app.post("/api/analytics/snapshot")
async def api_analytics_snapshot():
    record = analytics.snapshot()
    return JSONResponse({"code": 200, "data": record})

@app.get("/api/analytics/user-report/{user_id}")
async def api_user_report(user_id: str):
    report = analytics.user_report(user_id)
    return JSONResponse({"code": 200, "data": report})

@app.get("/api/analytics/weekly-summary/{user_id}")
async def api_weekly_summary(user_id: str):
    summary = analytics.weekly_summary(user_id)
    return JSONResponse({"code": 200, "data": summary})

@app.get("/api/analytics/system-health")
async def api_system_health():
    health = analytics.system_health()
    return JSONResponse({"code": 200, "data": health})

# ==================== 通知系统 ====================
from children_notifications import notifications

@app.post("/api/notifications/send")
async def api_send_notification(request: Request):
    body = await request.json()
    result = notifications.send(
        body.get("user_id", ""), body.get("channel", "in_app"),
        body.get("title", ""), body.get("body", ""),
        body.get("data"), body.get("priority", "normal"))
    return JSONResponse({"code": 200 if result["success"] else 400, "data": result})

@app.post("/api/notifications/send-template")
async def api_send_template(request: Request):
    body = await request.json()
    result = notifications.send_template(
        body.get("user_id", ""), body.get("channel", "in_app"),
        body.get("template", ""), body.get("variables", {}),
        body.get("data"), body.get("priority", "normal"))
    return JSONResponse({"code": 200 if result["success"] else 400, "data": result})

@app.post("/api/notifications/{notification_id}/read")
async def api_mark_read(notification_id: str):
    result = notifications.mark_read(notification_id)
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/notifications/mark-all-read/{user_id}")
async def api_mark_all_read(user_id: str):
    count = notifications.mark_all_read(user_id)
    return JSONResponse({"code": 200, "data": {"marked_read": count}})

@app.post("/api/notifications/preferences")
async def api_set_preference(request: Request):
    body = await request.json()
    result = notifications.set_preference(body.get("user_id", ""), body.get("channel", ""), body.get("enabled", True))
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/notifications/webhook")
async def api_register_webhook(request: Request):
    body = await request.json()
    result = notifications.register_webhook(body.get("user_id", ""), body.get("url", ""))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/notifications/stats")
async def api_notification_stats():
    return JSONResponse({"code": 200, "data": notifications.stats()})

# ==================== 家长控制 ====================
from children_parental import parental_control
from children_metrics import metrics, structured_log

@app.post("/api/parental/screen-time-limit")
async def api_set_screen_time(request: Request):
    body = await request.json()
    result = parental_control.set_screen_time_limit(body.get("user_id", ""), body.get("minutes_per_day", 120))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/parental/screen-time-remaining/{user_id}")
async def api_screen_time_remaining(user_id: str):
    result = parental_control.get_screen_time_remaining(user_id)
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/parental/log-activity")
async def api_log_activity(request: Request):
    body = await request.json()
    result = parental_control.log_activity(body.get("user_id", ""), body.get("type", ""), body.get("detail", ""), body.get("duration_minutes", 0))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/parental/activity-report/{user_id}")
async def api_activity_report(user_id: str, days: int = 7):
    result = parental_control.get_activity_report(user_id, days)
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/parental/content-filter")
async def api_content_filter(request: Request):
    body = await request.json()
    result = parental_control.set_content_filter(body.get("user_id", ""), body.get("category", ""), body.get("blocked", True))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/parental/content-allowed/{user_id}/{category}")
async def api_content_allowed(user_id: str, category: str):
    allowed = parental_control.is_content_allowed(user_id, category)
    return JSONResponse({"code": 200, "data": {"allowed": allowed}})

@app.post("/api/parental/bedtime")
async def api_set_bedtime(request: Request):
    body = await request.json()
    result = parental_control.set_bedtime(body.get("user_id", ""), body.get("start_time", "21:00"), body.get("end_time", "07:00"))
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/parental/learning-goal")
async def api_set_learning_goal(request: Request):
    body = await request.json()
    result = parental_control.set_learning_goal(body.get("user_id", ""), body.get("goal", ""), body.get("target", ""), body.get("metric", "lessons"))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/parental/dashboard/{user_id}")
async def api_parental_dashboard(user_id: str):
    result = parental_control.get_dashboard(user_id)
    return JSONResponse({"code": 200, "data": result})

# ==================== 指标 / Metrics ====================
from starlette.responses import Response as _StarletteResponse

@app.get("/metrics")
async def api_metrics():
    return _StarletteResponse(content=metrics.prometheus_format(), media_type="text/plain")

@app.get("/api/metrics/snapshot")
async def api_metrics_snapshot():
    return JSONResponse({"code": 200, "data": metrics.snapshot()})

# ==================== Webhook 系统 ====================
from children_webhooks import webhook_manager
from children_auth import authenticate, verify_token, require_role, parse_auth_header, register_user, change_password

# ==================== 认证 ====================
@app.post("/api/auth/register")
async def api_auth_register(request: Request):
    body = await request.json()
    result = register_user(body.get("username",""), body.get("password",""), body.get("role","child"), body.get("parent_id"))
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/auth/login")
async def api_auth_login(request: Request):
    body = await request.json()
    result = authenticate(body.get("username",""), body.get("password",""))
    return JSONResponse({"code": 200, "data": result})

@app.post("/api/auth/verify")
async def api_auth_verify(request: Request):
    payload = parse_auth_header(request.headers.get("Authorization"))
    return JSONResponse({"code": 200, "data": {"valid": payload is not None, "user": payload}})

@app.get("/api/auth/users")
async def api_auth_users(request: Request):
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload or not require_role(payload, "admin"):
        return JSONResponse({"code": 403, "data": {"error": "Forbidden"}})
    from children_database import database
    users = database.list_users()
    return JSONResponse({"code": 200, "data": users})

@app.get("/api/auth/me")
async def api_auth_me(request: Request):
    """Return the profile of the authenticated user."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload:
        return JSONResponse({"code": 401, "data": {"error": "Unauthorized"}}, status_code=401)
    from children_database import database
    user = database.fetchone(
        "SELECT user_id, name, age, role, parent_id, created_at FROM users WHERE user_id=?",
        (payload.get("sub"),),
    )
    if not user:
        return JSONResponse({"code": 404, "data": {"error": "User not found"}}, status_code=404)
    data = {"user": user, "expires_at": payload.get("exp")}
    return JSONResponse({"code": 200, "data": data})

@app.post("/api/auth/password/change")
async def api_auth_password_change(request: Request):
    """Change the authenticated user's password (old password must match)."""
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload:
        return JSONResponse({"code": 401, "data": {"error": "Unauthorized"}}, status_code=401)
    body = await request.json()
    result = change_password(
        payload.get("sub", ""),
        body.get("old_password", ""),
        body.get("new_password", ""),
    )
    return JSONResponse({"code": 200, "data": result})

# ==================== 搜索 ====================
@app.get("/api/search")
async def api_search(q: str = "", types: str = "", limit: int = 10):
    type_list = types.split(",") if types else None
    result = search_engine.search(q, type_list, limit)
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/search/suggest")
async def api_search_suggest(q: str = ""):
    result = search_engine.suggest(q)
    return JSONResponse({"code": 200, "data": {"suggestions": result}})

@app.post("/api/search/reindex")
async def api_search_reindex():
    from children_content_db import get_all_content
    content = get_all_content()
    search_engine.reindex(content)
    return JSONResponse({"code": 200, "data": {"status": "reindexed"}})

# ==================== 健康检查 ====================
@app.get("/health")
async def api_health():
    return JSONResponse({
        "code": 200,
        "data": {
            "status": "ok",
            "version": "2.0.0",
            "uptime_seconds": int(time.time() - _START_TIME),
            "timestamp": datetime.now().isoformat(),
        }
    })

@app.get("/api/health/detailed")
async def api_health_detailed():
    from children_persistence import DB_PATH
    db_exists = os.path.exists(str(DB_PATH))
    from children_content_db import get_stage_summary
    stages = get_stage_summary()
    from children_database import database
    try:
        db_stats = database.get_stats()
    except Exception:
        db_stats = {"error": "unavailable"}
    return JSONResponse({
        "code": 200,
        "data": {
            "status": "ok",
            "version": "2.0.0",
            "uptime_seconds": int(_rate_time.time() - _START_TIME),
            "routes": len([r for r in app.routes if hasattr(r, "path")]),
            "database": db_stats,
            "content": {
                "stages": len(stages),
                "total_courses": sum(s["course_count"] for s in stages),
                "total_lessons": sum(s["lesson_count"] for s in stages),
                "total_quizzes": sum(s["quiz_count"] for s in stages),
            },
            "timestamp": datetime.now().isoformat(),
        }
    })

# ==================== API 文档 ====================
from children_api_docs import generate_route_docs, build_openapi_json

@app.get("/api/docs/openapi.json")
async def api_openapi_json():
    import logging
    _logger = logging.getLogger("api_docs")
    try:
        docs = generate_route_docs(app)
        spec = build_openapi_json(docs)
        _logger.info(f"Generated OpenAPI spec with {len(spec.get('paths', {}))} paths")
        return JSONResponse(spec)
    except Exception as e:
        _logger.error(f"Failed to generate OpenAPI spec: {e}")
        return JSONResponse({
            "openapi": "3.0.3",
            "info": {"title": "Robot API", "version": "2.0.0"},
            "paths": {}
        })

@app.get("/api/docs/swagger")
async def api_swagger_ui():
    return HTMLResponse(f"""<!DOCTYPE html>
<html><head><title>API Docs</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script>SwaggerUIBundle({{url:"/api/docs/openapi.json",dom_id:"#swagger-ui"}})</script>
</body></html>""")

# ==================== 审计日志 ====================
@app.get("/api/audit/log")
async def api_audit_log(request: Request, limit: int = 100, offset: int = 0):
    payload = parse_auth_header(request.headers.get("Authorization"))
    if not payload or not require_role(payload, "admin"):
        return JSONResponse({"code": 403, "data": {"error": "Forbidden"}})
    from children_database import database
    log = database.get_audit_log(limit, offset)
    return JSONResponse({"code": 200, "data": {"entries": log, "count": len(log)}})

# ==================== 文件上传 ====================
from children_files import file_manager
from fastapi import UploadFile, File, Form

@app.post("/api/files/upload")
async def api_file_upload(request: Request, file: UploadFile = File(...),
                          user_id: str = Form("anonymous")):
    content = await file.read()
    result = file_manager.save(file.filename, content, user_id)
    if not result:
        return JSONResponse({"code": 400, "data": {"error": "File too large or invalid type"}})
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/files/{file_id}")
async def api_file_get(file_id: str):
    info = file_manager.get(file_id)
    if not info:
        return JSONResponse({"code": 404, "data": {"error": "File not found"}})
    return JSONResponse({"code": 200, "data": info})

@app.delete("/api/files/{file_id}")
async def api_file_delete(file_id: str):
    if file_manager.delete(file_id):
        return JSONResponse({"code": 200, "data": {"deleted": True}})
    return JSONResponse({"code": 404, "data": {"error": "File not found"}})

@app.get("/api/files/user/{user_id}")
async def api_files_by_user(user_id: str):
    files = file_manager.list_by_user(user_id)
    return JSONResponse({"code": 200, "data": files})

@app.get("/api/files/stats")
async def api_files_stats():
    return JSONResponse({"code": 200, "data": file_manager.get_stats()})

# ==================== 会话管理 ====================
from children_sessions import session_manager

@app.post("/api/sessions/create")
async def api_session_create(request: Request):
    body = await request.json()
    session = session_manager.create(
        body.get("user_id", ""), body.get("role", "child"),
        body.get("metadata"), body.get("ttl_seconds", 86400)
    )
    return JSONResponse({"code": 200, "data": session})

@app.get("/api/sessions/{session_id}")
async def api_session_get(session_id: str):
    session = session_manager.get(session_id)
    if not session:
        return JSONResponse({"code": 404, "data": {"error": "Session not found or expired"}})
    return JSONResponse({"code": 200, "data": session})

@app.post("/api/sessions/revoke/{session_id}")
async def api_session_revoke(session_id: str):
    session_manager.revoke(session_id)
    return JSONResponse({"code": 200, "data": {"revoked": True}})

@app.post("/api/sessions/revoke-all/{user_id}")
async def api_session_revoke_all(user_id: str):
    count = session_manager.revoke_all_for_user(user_id)
    return JSONResponse({"code": 200, "data": {"revoked_count": count}})

@app.get("/api/sessions/user/{user_id}")
async def api_session_list(user_id: str):
    sessions = session_manager.list_user_sessions(user_id)
    return JSONResponse({"code": 200, "data": sessions})

@app.get("/api/sessions/stats")
async def api_session_stats():
    return JSONResponse({"code": 200, "data": session_manager.get_stats()})

# ==================== 国际化 ====================
from children_i18n import i18n

@app.get("/api/i18n/locales")
async def api_i18n_locales():
    return JSONResponse({"code": 200, "data": i18n.get_supported_locales()})

@app.post("/api/i18n/set-locale")
async def api_i18n_set_locale(request: Request):
    body = await request.json()
    i18n.set_user_locale(body.get("user_id", ""), body.get("locale", "zh-CN"))
    return JSONResponse({"code": 200, "data": {"success": True}})

@app.get("/api/i18n/translate/{key}")
async def api_i18n_translate(key: str, locale: str = "zh-CN"):
    text = i18n.t(key, locale)
    return JSONResponse({"code": 200, "data": {"key": key, "locale": locale, "text": text}})

@app.get("/api/i18n/user-locale/{user_id}")
async def api_i18n_user_locale(user_id: str):
    locale = i18n.get_user_locale(user_id)
    return JSONResponse({"code": 200, "data": {"user_id": user_id, "locale": locale}})

# ==================== 定时任务 ====================
from children_scheduler import scheduler

@app.get("/api/scheduler/status")
async def api_scheduler_status():
    return JSONResponse({"code": 200, "data": {"tasks": scheduler.status(), "running": scheduler._running}})

@app.post("/api/scheduler/run/{task_name}")
async def api_scheduler_run(task_name: str):
    scheduler.run_once(task_name)
    return JSONResponse({"code": 200, "data": {"triggered": task_name}})

@app.post("/api/scheduler/toggle/{task_name}")
async def api_scheduler_toggle(task_name: str, enabled: bool = True):
    result = scheduler.set_enabled(task_name, enabled)
    return JSONResponse({"code": 200, "data": {"task": task_name, "enabled": enabled, "found": result}})

@app.post("/api/webhooks/register")
async def api_register_webhook(request: Request):
    body = await request.json()
    result = webhook_manager.register(body.get("url", ""), body.get("events", []), body.get("secret", ""))
    return JSONResponse({"code": 200, "data": result})

@app.get("/api/webhooks/list")
async def api_list_webhooks():
    return JSONResponse({"code": 200, "data": webhook_manager.list_webhooks()})

@app.delete("/api/webhooks/{hook_id}")
async def api_delete_webhook(hook_id: str):
    webhook_manager.delete(hook_id)
    return JSONResponse({"code": 200, "data": {"deleted": True}})

@app.post("/api/webhooks/test/{hook_id}")
async def api_test_webhook(hook_id: str):
    result = await webhook_manager.deliver(hook_id, {"event": "test", "message": "Hello from robot system"})
    return JSONResponse({"code": 200, "data": result})

# ==================== 持久化加载 ====================
def load_system_state():
    try:
        from children_persistence import load_all
        from children_conversation import ConversationMessage, ConversationSession
        state = load_all()
        if state.get("conversations"):
            for sid, data in state["conversations"].items():
                session = ConversationSession(
                    session_id=sid,
                    user_id=data.get("user_id", "unknown"),
                    language=data.get("language", "zh-CN"),
                    mode=data.get("mode", "free")
                )
                for m in data.get("messages", []):
                    if isinstance(m, dict):
                        session.messages.append(ConversationMessage(
                            role=m.get("role", "user"),
                            content=m.get("content", ""),
                            timestamp=m.get("timestamp", str(datetime.now()))
                        ))
                conversation_system.sessions[sid] = session
        if state.get("education_progress"):
            education_system.user_progress = state["education_progress"]
        if state.get("emotional_history"):
            emotional_system.load_history(state["emotional_history"])
        if state.get("learning"):
            learning_system.enrollments = state["learning"].get("enrollments", {})
            learning_system.records = {}
            for uid, recs in state["learning"].get("records", {}).items():
                learning_system.records[uid] = [
                    type("LR", (object,), r)() if isinstance(r, dict) else r
                    for r in recs
                ]
        if state.get("growth"):
            growth_system.load_state(state["growth"])
        print("  System state loaded from disk")
    except Exception as e:
        print(f"  No saved state found ({e})")

def save_system_state():
    try:
        from children_persistence import save_all
        data = {"conversations": {}}
        for sid, session in conversation_system.sessions.items():
            data["conversations"][sid] = {
                "session_id": sid, "user_id": session.user_id,
                "language": session.language, "mode": session.mode,
                "messages": [{"role": m.role, "content": m.content, "timestamp": str(m.timestamp)}
                            for m in session.messages],
            }
        data["education_progress"] = education_system.user_progress
        data["emotional_history"] = emotional_system.export_history()
        data["learning"] = {
            "enrollments": learning_system.enrollments,
            "records": {uid: [{"course_id": r.course_id, "lesson_id": r.lesson_id, "score": r.score,
                              "timestamp": str(r.timestamp), "duration_minutes": r.duration_minutes}
                             for r in recs] for uid, recs in learning_system.records.items()},
        }
        data["growth"] = growth_system.export_state()
        save_all(data)
        print("  System state saved to disk")
    except Exception as e:
        print(f"  Save state skipped ({e})")


# ==================== GDPR合规API ====================
GDPR_DATA_STORE: Dict[str, dict] = {}

@app.get("/api/gdpr/data/{user_id}")
async def gdpr_get_data(user_id: str):
    """Retrieve all personal data for GDPR right of access."""
    data = {"user_id": user_id, "profile": {}, "learning": [], "emotional": [], "sessions": []}
    try:
        from children_persistence import sqlite_query
        user = sqlite_query("SELECT * FROM users WHERE user_id=?", (user_id,))
        if user:
            data["profile"] = dict(user[0])
        records = sqlite_query("SELECT * FROM learning_records WHERE user_id=?", (user_id,))
        data["learning"] = [dict(r) for r in records]
        emotions = sqlite_query("SELECT * FROM emotional_history WHERE user_id=?", (user_id,))
        data["emotional"] = [dict(e) for e in emotions]
    except Exception:
        pass
    GDPR_DATA_STORE[user_id] = data
    return {"code": 200, "data": data, "exported_at": datetime.now().isoformat()}

@app.post("/api/gdpr/delete")
async def gdpr_delete_user(request: Request):
    """Delete user data (GDPR right to erasure / right to be forgotten)."""
    body = await request.json()
    user_id = body.get("user_id", "")
    confirmed = body.get("confirmation", False)
    if not confirmed:
        return JSONResponse(status_code=400, content={"code": 400, "error": "Confirmation required"})
    try:
        from children_persistence import sqlite_execute
        for table in ["users", "learning_records", "learning_enrollments", "emotional_history",
                       "education_progress", "achievements", "messages"]:
            sqlite_execute(f"DELETE FROM {table} WHERE user_id=?", (user_id,))
        sqlite_execute("DELETE FROM conversations WHERE user_id=?", (user_id,))
        _logger.info(f"GDPR delete completed for user {user_id}")
        return {"code": 200, "message": f"All data for {user_id} has been deleted", "deleted_at": datetime.now().isoformat()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"code": 500, "error": str(e)})

@app.get("/api/gdpr/export/{user_id}")
async def gdpr_export(user_id: str):
    """Export all user data as downloadable JSON (GDPR data portability)."""
    data = GDPR_DATA_STORE.get(user_id, {})
    if not data:
        return JSONResponse(status_code=404, content={"code": 404, "error": "No data found. Call GET /api/gdpr/data/{user_id} first."})
    from fastapi.responses import JSONResponse as _ExportResponse
    return _ExportResponse(
        content={"code": 200, "data": data, "exported_at": datetime.now().isoformat()},
        headers={"Content-Disposition": f'attachment; filename="gdpr_export_{user_id}.json"'}
    )

# ==================== 订阅管理API ====================
SUBSCRIPTION_PLANS = {
    "free": {"name": "Free", "price": 0, "features": ["basic_chat", "daily_quiz", "5_activities_per_day"]},
    "basic": {"name": "Basic", "price": 4.99, "currency": "EUR", "period": "month",
              "features": ["unlimited_chat", "all_quizzes", "learning_tracking", "email_reports"]},
    "premium": {"name": "Premium", "price": 9.99, "currency": "EUR", "period": "month",
                "features": ["unlimited_chat", "all_quizzes", "learning_tracking", "email_reports",
                             "parental_controls", "multi_language", "priority_support"]},
    "family": {"name": "Family", "price": 14.99, "currency": "EUR", "period": "month",
               "features": ["all_premium_features", "up_to_4_children", "shared_content", "family_dashboard"]},
}
SUBSCRIPTIONS: Dict[str, dict] = {}

@app.get("/api/subscription/plans")
async def subscription_plans():
    return {"code": 200, "data": SUBSCRIPTION_PLANS}

@app.post("/api/subscription/create")
async def subscription_create(request: Request):
    body = await request.json()
    user_id = body.get("user_id", "")
    plan = body.get("plan", "free")
    auto_renew = body.get("auto_renew", True)
    if plan not in SUBSCRIPTION_PLANS:
        return JSONResponse(status_code=400, content={"code": 400, "error": f"Invalid plan: {plan}"})
    now = datetime.now()
    SUBSCRIPTIONS[user_id] = {
        "user_id": user_id, "plan": plan,
        "features": SUBSCRIPTION_PLANS[plan]["features"],
        "started_at": now.isoformat(),
        "renewal_at": (now.replace(month=now.month + 1) if now.month < 12 else now.replace(year=now.year + 1, month=1)).isoformat(),
        "auto_renew": auto_renew, "status": "active"
    }
    _logger.info(f"Subscription created: user={user_id}, plan={plan}")
    return {"code": 200, "data": SUBSCRIPTIONS[user_id]}

@app.get("/api/subscription/status/{user_id}")
async def subscription_status(user_id: str):
    sub = SUBSCRIPTIONS.get(user_id, {"user_id": user_id, "plan": "free", "features": SUBSCRIPTION_PLANS["free"]["features"],
                                       "status": "active", "started_at": "N/A"})
    return {"code": 200, "data": sub}

@app.post("/api/subscription/cancel/{user_id}")
async def subscription_cancel(user_id: str):
    if user_id in SUBSCRIPTIONS:
        SUBSCRIPTIONS[user_id]["status"] = "cancelled"
        SUBSCRIPTIONS[user_id]["auto_renew"] = False
    return {"code": 200, "message": "Subscription cancelled", "user_id": user_id}

# ==================== 支付模拟API ====================
PAYMENT_TRANSACTIONS: List[dict] = []

@app.post("/api/payment/simulate")
async def payment_simulate(request: Request):
    body = await request.json()
    user_id = body.get("user_id", "")
    amount = body.get("amount", 0)
    currency = body.get("currency", "EUR")
    method = body.get("method", "card")
    description = body.get("description", "")
    success = random.random() > 0.1
    txn = {
        "id": str(_uuid.uuid4())[:8],
        "user_id": user_id, "amount": amount, "currency": currency,
        "method": method, "description": description,
        "status": "completed" if success else "failed",
        "created_at": datetime.now().isoformat()
    }
    PAYMENT_TRANSACTIONS.append(txn)
    if success:
        sub = SUBSCRIPTIONS.get(user_id, {})
        if sub and sub.get("status") == "pending_payment":
            sub["status"] = "active"
        _logger.info(f"Payment completed: user={user_id}, amount={amount}{currency}")
    else:
        _logger.warning(f"Payment failed: user={user_id}, amount={amount}{currency}")
    return {"code": 200 if success else 402, "data": txn}

@app.get("/api/payment/history/{user_id}")
async def payment_history(user_id: str):
    txns = [t for t in PAYMENT_TRANSACTIONS if t["user_id"] == user_id]
    return {"code": 200, "data": txns}

# ==================== 内容预览API ====================
@app.get("/api/preview/content/{content_type}")
async def preview_content(content_type: str):
    """Preview content types: courses, quizzes, lessons, features."""
    from children_content_db import get_stage_summary, KINDERGARTEN_COURSES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES, QUIZ_DATABASE
    if content_type == "courses":
        return {"code": 200, "data": {
            "kindergarten": list(KINDERGARTEN_COURSES.keys()),
            "primary": list(PRIMARY_COURSES.keys()),
            "middle_school": list(MIDDLE_SCHOOL_COURSES.keys()),
        }}
    elif content_type == "quizzes":
        return {"code": 200, "data": list(QUIZ_DATABASE.keys())}
    elif content_type == "summary":
        return {"code": 200, "data": get_stage_summary()}
    return JSONResponse(status_code=400, content={"code": 400, "error": f"Unknown type: {content_type}"})

# ==================== 通知模板API ====================
NOTIFICATION_TEMPLATES = {
    "welcome": {"en": "Welcome {name}!", "zh-CN": "欢迎 {name}!", "fr": "Bienvenue {name}!", "de": "Willkommen {name}!"},
    "achievement": {"en": "Congratulations! You unlocked {badge}", "zh-CN": "恭喜！你解锁了 {badge}", "fr": "Félicitations ! Vous avez débloqué {badge}", "de": "Glückwunsch! Du hast {badge} freigeschaltet"},
    "reminder": {"en": "Time to study {subject}!", "zh-CN": "该学习 {subject} 了！", "fr": "Il est temps d'étudier {subject} !", "de": "Zeit, {subject} zu lernen!"},
    "bedtime": {"en": "Goodnight {name}, sleep well!", "zh-CN": "晚安 {name}，好梦！", "fr": "Bonne nuit {name}, fais de beaux rêves !", "de": "Gute Nacht {name}, schlaf gut!"},
    "progress": {"en": "Great progress in {subject}! {score}% achieved", "zh-CN": "在 {subject} 上进步很大！获得了 {score}%", "fr": "Beaux progrès en {subject} ! {score}% atteint", "de": "Tolle Fortschritte in {subject}! {score}% erreicht"},
}

@app.get("/api/notifications/templates")
async def notification_templates():
    return {"code": 200, "data": {k: list(v.keys()) for k, v in NOTIFICATION_TEMPLATES.items()}}

@app.post("/api/notifications/preview")
async def notification_preview(request: Request):
    body = await request.json()
    template_name = body.get("template", "welcome")
    locale = body.get("locale", "en")
    params = body.get("params", {})
    template = NOTIFICATION_TEMPLATES.get(template_name, {}).get(locale, "")
    if not template:
        return JSONResponse(status_code=404, content={"code": 404, "error": f"Template {template_name} not found for {locale}"})
    for k, v in params.items():
        template = template.replace(f"{{{k}}}", str(v))
    return {"code": 200, "data": {"rendered": template, "template": template_name, "locale": locale}}

# NOTE: parameterised route must be declared AFTER all static /api/notifications/*
# routes (stats, templates), otherwise it shadows them and FastAPI would treat
# "stats"/"templates" as a user_id.
@app.get("/api/notifications/{user_id}")
async def api_get_notifications(user_id: str, limit: int = 50, unread_only: bool = False):
    ns = notifications.get_notifications(user_id, limit, unread_only)
    count = notifications.get_unread_count(user_id)
    return JSONResponse({"code": 200, "data": {"notifications": ns, "unread_count": count}})


# ==================== 启动服务器 ====================
if __name__ == "__main__":
    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║   🤖 欧洲儿童陪护机器人 - 完整系统 v1.0 🤖                  ║
╠═══════════════════════════════════════════════════════════════╣
║   🌟 核心功能:                                                ║
║      • 智能对话系统 (多语言支持,情感识别)                    ║
║      • 教育技能系统 (作业辅导,口语练习,知识点讲解)           ║
║      • 娱乐技能系统 (讲故事,音乐欣赏,互动游戏)               ║
║      • 情感陪伴系统 (心理陪伴,情绪识别,习惯培养)             ║
║      • 学习管理系统 (课程管理,进度跟踪,成绩分析)             ║
║      • 成长记录系统 (成就展示,技能解锁,习惯打卡)             ║
║      • 设备控制系统 (模式切换,远程控制)                     ║
║      • 管理中心 (用户管理,设备管理,数据分析)                 ║
║      • 数据同步系统 (三端同步,冲突处理)                     ║
║      • 安全合规系统 (GDPR, CE认证, AI法案)                   ║
║                                                               ║
║   🆕 AI能力:                                                 ║
║      • LangChain集成 (多模型融合引擎)                       ║
║      • LangGraph工作流 (图驱动工作流)                       ║
║      • 边缘AI能力 (本地模型部署,增量训练)                   ║
║      • 自主代理能力 (任务规划,工具选择)                     ║
║                                                               ║
║   🌐 访问地址:                                                ║
║      • 首页: http://localhost:{PORT}/                         ║
║      • 机器人端: http://localhost:{PORT}/robot              ║
║      • 家长端APP: http://localhost:{PORT}/parent-app        ║
║      • 管理中心: http://localhost:{PORT}/admin              ║
║      • 学习中心: http://localhost:{PORT}/learning           ║
║      • 成长记录: http://localhost:{PORT}/growth            ║
║      • 情感陪伴: http://localhost:{PORT}/emotional         ║
║      • 娱乐中心: http://localhost:{PORT}/entertainment      ║
║      • 管理控制台: http://localhost:{PORT}/console            ║
║                                                               ║
║   📡 技术栈:                                                 ║
║      • FastAPI + Uvicorn (异步API框架)                      ║
║      • LangChain + LangGraph (AI框架)                       ║
║      • WebSocket + MQTT (实时通信)                           ║
║      • PostgreSQL + MongoDB + Redis (数据存储)              ║
║      • RK3588 + NPU (边缘AI加速)                            ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
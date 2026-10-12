#!/usr/bin/env python3
"""Auto-generated OpenAPI/Swagger documentation for all API routes."""

from typing import Dict, List, Any
from datetime import datetime

OPENAPI_INFO = {
    "openapi": "3.0.3",
    "info": {
        "title": "欧洲儿童陪护机器人 API",
        "description": "European Children Companion Robot - RESTful API for education, emotional support, growth tracking, device management, and parental controls.",
        "version": "2.0.0",
        "contact": {"name": "Robot Team", "email": "dev@robot.example.com"},
    },
    "servers": [
        {"url": "http://localhost:8888", "description": "Development"},
        {"url": "https://api.robot.example.com", "description": "Production"},
    ],
    "components": {
        "securitySchemes": {
            "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
        },
        "schemas": {
            "Error": {"type": "object", "properties": {
                "code": {"type": "integer"}, "message": {"type": "string"},
                "correlation_id": {"type": "string"}
            }},
            "Success": {"type": "object", "properties": {
                "code": {"type": "integer"}, "data": {"type": "object"}
            }},
        },
    },
}

def get_tag_groups() -> List[Dict]:
    return [
        {"name": "Authentication", "description": "User registration, login, token verification"},
        {"name": "Education", "description": "Courses, lessons, skills, progress tracking"},
        {"name": "Learning", "description": "Enrollment, lesson recording, quiz management"},
        {"name": "Emotional", "description": "Emotion analysis, companion conversations"},
        {"name": "Conversation", "description": "Chat messaging, AI-powered dialogue"},
        {"name": "Growth", "description": "Growth timeline, milestone tracking"},
        {"name": "Device", "description": "Device registration, control, status"},
        {"name": "Security", "description": "Security status, privacy consent"},
        {"name": "Admin", "description": "Dashboard KPIs, stage statistics, system management"},
        {"name": "Data Sync", "description": "Multi-device data synchronization"},
        {"name": "Recommendation", "description": "Personalized course, activity, quiz recommendations"},
        {"name": "Analytics", "description": "Cross-module analytics, user reports, system health"},
        {"name": "Notifications", "description": "Multi-channel notifications, preferences, webhooks"},
        {"name": "Parental Control", "description": "Screen time limits, content filters, bedtime schedule"},
        {"name": "Metrics", "description": "Prometheus metrics, monitoring data"},
        {"name": "Search", "description": "Full-text search across all content"},
        {"name": "Health", "description": "System health checks, diagnostics"},
        {"name": "Audit", "description": "Audit logging for admin operations"},
    ]

def build_openapi_json(routes: List[Dict]) -> Dict:
    paths = {}
    for r in routes:
        path = r.get("path", "")
        method = r.get("method", "get").lower()
        if path not in paths:
            paths[path] = {}
        paths[path][method] = {
            "summary": r.get("summary", path),
            "tags": r.get("tags", ["General"]),
            "parameters": r.get("parameters", []),
            "responses": {
                "200": {"description": "Successful response", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Success"}}}},
                "422": {"description": "Validation error", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
                "500": {"description": "Internal error", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
            },
            "security": [{"BearerAuth": []}] if r.get("auth", False) else [],
        }
    doc = dict(OPENAPI_INFO)
    doc["tags"] = get_tag_groups()
    doc["paths"] = paths
    return doc

def generate_route_docs(app) -> List[Dict]:
    docs = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods - {"HEAD", "OPTIONS"}:
                tags = ["General"]
                path = route.path
                for prefix, tag in [("/api/auth", "Authentication"), ("/api/education", "Education"),
                    ("/api/learning", "Learning"), ("/api/emotional", "Emotional"),
                    ("/api/conversation", "Conversation"), ("/api/growth", "Growth"),
                    ("/api/device", "Device"), ("/api/security", "Security"),
                    ("/api/admin", "Admin"), ("/api/sync", "Data Sync"),
                    ("/api/recommend", "Recommendation"), ("/api/analytics", "Analytics"),
                    ("/api/notifications", "Notifications"), ("/api/parental", "Parental Control"),
                    ("/api/search", "Search"), ("/health", "Health"), ("/api/audit", "Audit")]:
                    if path.startswith(prefix):
                        tags = [tag]
                        break
                docs.append({
                    "path": path, "method": method, "tags": tags,
                    "summary": path.split("/")[-1].replace("_", " ").title(),
                    "auth": not any(path.startswith(p) for p in ["/console", "/metrics", "/health"]),
                })
    return docs

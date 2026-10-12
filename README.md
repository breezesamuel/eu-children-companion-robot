# 欧洲儿童陪护机器人 — RoboBuddy

European Children Companion Robot — An intelligent, multi-modal companion for children aged 3–15.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React SPA / Console (port 8888 /console)               │
├─────────────────────────────────────────────────────────┤
│  Python FastAPI (port 8888)                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Children Modules:                                │    │
│  │ conversation ── education ── emotional           │    │
│  │ learning    ── growth     ── device             │    │
│  │ security    ── data_sync  ── admin              │    │
│  │ entertainment ── recommend ── pagination        │    │
│  │ langchain   ── langgraph  ── edge_ai            │    │
│  │ content_db  ── config     ── cache              │    │
│  │ persistence ── pagination                       │    │
│  └─────────────────────────────────────────────────┘    │
│  WebSocket: /ws, /ws/device/{device_id}                  │
│  80 API routes + 2 WS + 16 HTML = 98 total routes       │
├─────────────────────────────────────────────────────────┤
│  Node.js Backend (port 3000)                             │
│  Auth · Commerce · LLM · TTS · Video · Scraping         │
│  38 services, 300+ API routes                            │
├─────────────────────────────────────────────────────────┤
│  MCP Server (port 8000 · 34+ tools)                     │
│  File ops · OCR · Crypto · TTS · Database               │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL · Redis · Mosquitto (MQTT)                  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Python FastAPI (core modules)
```bash
pip install -r requirements-python.txt
python children_robot_system.py
# → http://localhost:8888
```

### Node.js Backend
```bash
cd project_source
npm install
cp .env.example .env  # edit credentials
node server.js
# → http://localhost:3000
```

### Docker (full stack)
```bash
cd project_source
docker compose up --build
# Python API :8888 · Node.js :3000 · MCP :8000 · Postgres :5432
```

## Modules

| Module | File | Purpose |
|--------|------|---------|
| Conversation | `children_conversation.py` | Multi-lingual chat, session management |
| Education | `children_education.py` | 12 skills across 6 subjects, quiz system |
| Emotional | `children_emotional.py` | Emotion analysis, companion responses |
| Learning | `children_learning.py` | Course enrollment, progress tracking |
| Growth | `children_growth.py` | Achievements, timeline, leaderboard |
| Device | `children_device.py` | Robot management, command dispatch |
| Security | `children_security.py` | GDPR, CE compliance, audit logging |
| Admin | `children_admin.py` | Dashboard KPI, user management |
| Data Sync | `children_data_sync.py` | Offline queue, conflict resolution |
| Entertainment | `children_entertainment.py` | Content catalog, favorites, queue |
| Content DB | `children_content_db.py` | 3 stages · 50 courses · 412 lessons · 196 quizzes |
| Recommend | `children_recommend.py` | Cross-module recommendation engine |
| Cache | `children_cache.py` | In-memory + Redis-ready caching |
| Config | `children_config.py` | Centralized env-based configuration |
| LangChain | `children_langchain.py` | Multi-model LLM orchestration |
| LangGraph | `children_langgraph.py` | Graph-based workflow execution |
| Edge AI | `children_edge_ai.py` | Local model inference, ONNX support |
| Pagination | `children_pagination.py` | Shared pagination utility |

## Content Library

| Stage | Courses | Lessons | Age Range |
|-------|---------|---------|-----------|
| Kindergarten | *built into skills* | — | 3–6 |
| Primary (G1–G6) | 22 | 188 | 6–12 |
| Middle School (G7–G9) | 21 | 186 | 12–15 |
| **Total** | **50+** | **412+** | **3–15** |

Quiz bank: **196 questions** across 28 categories covering math, language, science, history, geography, physics, chemistry, biology, and more.

## API Routes (80 total)

| Prefix | Routes | Module |
|--------|--------|--------|
| `/api/conversation/*` | 2 | Chat & history |
| `/api/education/*` | 4 | Skills, quiz, progress |
| `/api/emotional/*` | 2 | Analysis, companion |
| `/api/learning/*` | 3 | Enroll, report, courses |
| `/api/growth/*` | 4 | Achievements, timeline, goals |
| `/api/device/*` | 2 | Status, control, logs |
| `/api/security/*` | 6 | Compliance, consent, audit |
| `/api/admin/*` | 6 | Dashboard, users, health |
| `/api/sync/*` | 4 | Push, pull, delta, conflicts |
| `/api/entertainment/*` | 5 | Content, queue, favorites |
| `/api/stages/*` | 6 | Stage-specific content |
| `/api/recommend/*` | 6 | Cross-module recommendations |
| `/api/edge-ai/*` | 3 | Model management |
| `/api/langchain/*` | 3 | Chain execution |
| `/api/langgraph/*` | 3 | Workflow management |
| `/api/{health,ping,info,ws/stats}` | 4 | System |
| **Total** | **80** | |

## WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `ws://host:8888/ws` | Client connection (ping/subscribe/command) |
| `ws://host:8888/ws/device/{device_id}` | Device telemetry relay |

Telemetry broadcast every 5s: uptime, active sessions, enrollments, achievements, devices online, WS clients.

## Testing

```bash
# Integration test (41 checks, 8 cross-module flows)
python /path/to/test_integration.py

# Unit tests (17 modules)
python tests/test_all_unit.py
```

## Deployment

The production stack uses Docker Compose with: Nginx reverse proxy (SSL), PostgreSQL 16 + Redis 7 + Mosquitto 2, Node.js backend + Python FastAPI + MCP Server, React SPA via Nginx or Python.

Nginx routes: `/api/{conversation,education,...}` → python_app:8888, `/ws` → python_app:8888, `/api/*` → node_app:3000, `/mcp/` → mcp_app:8000.

## License

MIT

# RoboMate Startup Guide

## Quick Start

```bash
cd project_source
npm start
```

Server runs on `http://localhost:3000`

### Login Credentials (dev mode)
- **Parent**: `parent@test.com` / `parent123`
- **Admin**: `admin@test.com` / `admin123`

## What's Fixed (this session)

| Bug | File | Fix |
|-----|------|-----|
| `/api/v1/children` always returns 401 | `backend/api/v1/child.js` | `req.user?.user_id` → `req.user?.userId` |
| Storefront auth bypassed (duplicate mount) | `server.js` | Removed duplicate, kept single public mount |
| MemoryDatabase UPDATE corrupts data | `utils/database.js` lines 192-216 | Rewrote parameter binding logic |
| `INSERT OR REPLACE` (SQLite syntax) | `routes/learning.js` line 148 | Rewrote as SELECT-then-UPDATE/INSERT |
| `COUNT(*)` + double-quoted strings crash | `routes/robots.js` lines 143-146 | Rewrote with array methods |
| Fake streaming blocks event loop | `agents/orchestrator.js` | Batched 5 words/chunk, 80-120ms delay |
| `@sendgrid/mail` not installed | `package.json` | Added dependency + installed |
| No `.env` support | `server.js`, new `.env` | Added `dotenv` loading, created `.env` |
| Storefront dashboard returns 401 | `routes/storefront.js` | Added `authenticateToken` to dashboard route |

**32/32 tests pass** (10 database + 22 API integration)

## Architecture

```
server.js ──► MemoryDatabase (in-memory, default)
            │
            ├── PostgreSQL (if DATABASE_URL is set)
            │
            ├── routes/               → API endpoints
            ├── middleware/           → auth, security, rate-limiter, monitoring
            ├── agents/              → 4 AI agents + hardware command orchestrator
            ├── integrations/        → Plugins, LLM hub, MCP, browser, voice
            ├── services/            → AI, payment, email, alerts, robot-manager
            ├── services/            → websocket-server (ws://, 5 client roles)
            ├── robot/               → Robot HAL (simulated sensors, actuators, state machine)
            └── docs/                → Frontend HTML files (unified dashboard, admin)
```

## WebSocket

- **URL**: `ws://localhost:3000/ws?token=<JWT>`
- **Roles**: `robot`, `app`, `parent`, `admin`, `school`
- Robot clients broadcast telemetry/sensor/speech/expression events every 5s
- App/parent clients subscribe to robot telemetry via `subscribe` messages
- Bidirectional command relay: app → robot commands through the server

## API Endpoint Map

### Public (no auth required)
| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/products` | Product catalog |
| `GET /api/products/pricing/plans` | Pricing grouped by type |
| `GET /api/products/features/list` | Feature list |
| `GET /api/storefront/pricing` | Pricing (public) |
| `GET /api/storefront/features` | Features (public) |
| `GET /api/support/faq` | FAQ |
| `GET /api/content/*` | All content endpoints |
| `GET /api/v2/content/*` | Content (alias) |
| `POST /api/auth/register` | Register |
| `POST /api/auth/login` | Login |

### Auth Required (JWT Bearer token)
| Endpoint | Description |
|----------|-------------|
| `GET /api/storefront/dashboard` | Customer dashboard |
| `GET /api/users/*` | User management |
| `GET/POST /api/gdpr/*` | GDPR tools |
| `GET /api/orders/my` | My orders |
| `POST /api/orders/create-checkout` | Checkout |
| `GET /api/subscriptions/my` | My subscriptions |
| `POST /api/subscriptions/cancel/:id` | Cancel subscription |
| `POST /api/agents/chat` | AI agent chat |
| `GET /api/agents/sessions` | List sessions |
| `GET/POST /api/support/tickets` | Support tickets |
| `GET /api/admin/*` | Admin operations (super + school admin) |
| `GET /api/robot/*` | Robot control & telemetry |
| `GET /api/alerts/*` | Parent alert management |

### Robot Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/robot` | List all robots (scoped by role) |
| `GET /api/robot/:id` | Single robot status, battery, expression, uptime |
| `POST /api/robot/:id/command` | Execute command (`move`, `speak`, `express`, `photo`, `detect`, etc.) |
| `POST /api/robot/:id/bind` | Bind parent to robot (ownership) |
| `GET /api/robot/:id/log` | Recent command log |
| `GET /api/robot/:id/telemetry` | Sensor telemetry stream |
| `POST /api/robot/:id/start` | Start robot heartbeat |
| `POST /api/robot/:id/stop` | Stop robot heartbeat |

### Alert Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/alerts` | List alerts (filterable by child, type, unread) |
| `GET /api/alerts/recent` | Recent alerts (last 24h) |
| `POST /api/alerts/:id/read` | Mark single alert as read |
| `POST /api/alerts/read-all` | Mark all alerts as read |
| `GET /api/alerts/subscribe` | Subscribe to alert notifications |
| `POST /api/alerts/simulate` | Simulate an alert (dev/testing) |

### Two-Tier Admin Endpoints (under `/api/admin`)
| Endpoint | Role | Description |
|----------|------|-------------|
| `GET /api/admin/school/robots` | admin, school_admin | List school robots |
| `GET /api/admin/school/stats` | admin, school_admin | Robot online/offline/charging counts |
| `POST /api/admin/school/robot/:id/command` | admin, school_admin | Execute robot command from admin panel |
| `GET /api/admin/users` | admin only | List all users |
| `PUT /api/admin/users/:id/role` | admin only | Change user role (parent/school_admin/admin) |
| `GET /api/admin/system` | admin only | System overview (tables, uptime, counts) |
| `GET /api/admin/config` | admin only | System config (read) |
| `PUT /api/admin/config` | admin only | Update config key |
| `GET /api/admin/orders` | admin only | All orders |
| `PUT /api/admin/orders/:id` | admin only | Update order status |
| `GET /api/admin/tickets` | admin only | All support tickets |
| `PUT /api/admin/tickets/:id` | admin only | Update ticket status |
| `GET /api/admin/analytics/dashboard` | admin only | Analytics dashboard |

## Making It a Real Product

### Step 1: Add Real LLM API Keys
Edit `.env` and set at least one:
```
OPENAI_API_KEY=sk-...          # OpenAI GPT-4
DEEPSEEK_API_KEY=sk-...        # DeepSeek
ZHIPU_API_KEY=...              # 智谱 GLM-4
DASHSCOPE_API_KEY=sk-...       # 通义千问 Qwen
```

### Step 2: Connect Real Database (optional)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/robomate
```

### Step 3: Enable Real Payments
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4: Spring Boot Backend
The `management_center/backend/` has a Spring Boot skeleton but needs:
- `application.properties` with DB config
- Full service implementations
- Maven build: `mvn clean package -DskipTests`

### Step 5: Access Dashboard
Open `http://localhost:3000/docs/unified-dashboard.html` in a browser. The sidebar includes a new **Robot Control** page with:
- Live robot state, battery, expression, uptime
- 15 one-click command buttons (move, express, photo, scan, etc.)
- Command input for any natural language instruction
- Real-time telemetry feed (refreshes every 5 seconds)
- Command log showing recent robot activity

### Step 6: Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Development
```bash
# Run tests
npm run test:all

# Test robot commands
curl -X POST http://localhost:3000/api/robot/robomate-001/command \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"command":"move forward"}'

# Test alerts
curl -X POST http://localhost:3000/api/alerts/simulate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"safety","childName":"Emma","details":"Child approaching stairs"}'

# Test WebSocket (Node.js)
node -e "const WebSocket=require('ws');const ws=new WebSocket('ws://localhost:3000/ws?token=<token>&robotId=robomate-001');ws.on('message',d=>console.log(d.toString()))"
```

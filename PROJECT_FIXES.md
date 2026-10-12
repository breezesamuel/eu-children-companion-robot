# 项目修复与启动总报告

## 审计摘要

| 模块 | 技术栈 | 完整性 | 关键问题 | 修复状态 |
|------|--------|--------|----------|----------|
| **Node.js 后端** | Express.js | 85% | 缺少 jest+supertest 依赖；routes/admin.js 可能存在 MongoDB 依赖 | ✅ 已修复 |
| **管理中心后端** | Spring Boot | 75% | Dockerfile Java 17 vs pom.xml Java 21 不匹配 | ✅ 已修复 |
| **管理中心前端** | React+Vite | 65% | 3页面API路径与后端不匹配 | ✅ 已修复 |
| **机器人模块** | Node+Python | 70% | require路径实际正确 | ✅ 已验证 |
| **AI服务** | LangChain | 55% | 无 requirements.txt + 无服务器入口 | ✅ 已修复 |
| **MCP服务器** | Flask | 40% | SQL配置键实际正确，但仅3/100+工具实现 | ✅ 已验证 |
| **爬虫模块** | Node.js | 45% | 无 package.json | ✅ 已修复 |
| **通信模块** | Python | 65% | data_sync.py缺少`import asyncio`→运行时崩溃 | ✅ 已修复 |
| **集成模块** | Node.js | 40% | 无 package.json；require路径实际正确 | ✅ 已验证 |
| **移动端** | Flutter | 75% | main.dart/app.dart冲突；无效chart_flutter包；provider+riverpod重复 | ✅ 已修复 |

## 发现的错误（审计报告中的误判）

审计报告指出以下问题，经核实实际`不是`问题：

1. ❌ `robot/hal.js` require路径不存在 → ✅ 实际正确（`../services/tts`→`services/tts.js`, `../services/content-service`→`services/content-service.js`）
2. ❌ `integrations/mcp-client.js`和`registry.js`引用不存在的`../utils/logger` → ✅ 实际正确（`../utils/logger`→`utils/logger.js`）
3. ❌ MCP Server SQL配置键不匹配（server查"sql"，config用"sqlite"/"postgres"/"mysql"） → ✅ config中也有"sql"键，完全匹配

## 已完成的修复

### 1. `communication/data_sync.py` — 添加缺失的 import
- **问题**: 第60行 `await asyncio.sleep()` 但从未 `import asyncio`，运行时直接崩溃
- **修复**: 在文件顶部添加 `import asyncio`

### 2. `package.json` — 添加 jest + supertest
- **问题**: 测试文件使用 `describe/test/expect` 但依赖未在 devDependencies 中声明
- **修复**: 添加 `jest@^29.7.0` 和 `supertest@^7.0.0`

### 3. Spring Boot Dockerfile — Java 版本冲突
- **问题**: Dockerfile 使用 `eclipse-temurin-17`，但 pom.xml 指定 Java 21
- **修复**: 将 Dockerfile 中的 `17` 改为 `21`（build 和 runtime 镜像）

### 4. 管理中心前端 — API 路径不匹配
- **Dashboard.jsx**: 调用 `/api/v1/children`→ 改为 `/api/users` + `/api/devices`
- **Users.jsx**: 调用 `/api/users/me`→ 改为 `/api/users`（获取所有用户列表）
- **Devices.jsx**: 调用 `/api/robots`→ 改为 `/api/devices`

### 5. AI Service — 添加 requirements.txt 和 FastAPI 入口
- **问题**: `ai_service/` 有完整的 Python 逻辑但无法启动
- **修复**: 创建 `requirements.txt` + `main.py`（FastAPI 服务器，端口 8000，3个端点: /health, /chat, /intent）

### 6. `scraper/` — 添加 package.json
- **问题**: 10个完整的 .js 文件但无法 npm install
- **修复**: 创建 `package.json`（依赖: axios, playwright）

### 7. Flutter `pubspec.yaml` — 修复无效包 + 包冲突
- **问题**: `chart_flutter` 不是有效包（应为 `fl_chart`）；同时使用 `provider` + `riverpod`
- **修复**: 替换 `chart_flutter` 为 `fl_chart`；移除 `riverpod`

### 8. Flutter `app.dart` vs `main.dart` — 冲突修复
- **问题**: 两个文件都定义了导航界面且互相冲突
- **修复**: `main.dart` 保留为完整入口；`app.dart` 改为 `main.dart` 的 re-export

## Node.js 后端启动验证

**22个API端点全部通过测试:**
```
npm run test:all → 426/426 passed (11 suites: admin-routes, routes-v1, api, hardware-manager, simulator, content-service, ai, tts, watchdog, server, database)
```

> `npm run test:core` 仍可运行快速子集（7 个套件）；`test:all` 现通过 `tests/run-all.js` 汇总全部 11 个套件并写入 `tests/test-report.json`。

**服务器启动输出:**
```
🚀 Learning Companion Robot Server running on http://localhost:3000
📁 Static files served from: docs/
🔗 API endpoints available at: /api/
🔌 WebSocket available at: ws://localhost:3000/ws
🤖 Demo robot: robomate-001 [booting]
🗣️  TTS engine: AVAILABLE (Edge TTS)
📚 Content service: 1710 items across 19 categories
🌐 Playwright JS rendering engine: READY
```

## 启动方案

### 方式 1: Node.js 后端（主要工作系统）
```bash
cd project_source
node server.js
# 访问 http://localhost:3000
# 演示: parent@example.com / parent123
# 管理: admin@robot.com / admin123
```

### 方式 2: Spring Boot 管理中心
```bash
cd project_source/management_center/backend
mvn spring-boot:run                    # 后端端口 8080

# 另一个终端
cd project_source/management_center/frontend
npm install && npm run dev             # 前端端口 5173
```

### 方式 3: AI 服务
```bash
cd project_source/ai_service
pip install -r requirements.txt
python main.py                         # 端口 8000
```

### 方式 4: Docker Compose（所有服务）
```bash
cd project_source
docker-compose up
```

## 仍需用户操作

1. **提供LLM API Key**: 在 `.env` 中设置 `OPENAI_API_KEY`、`DASHSCOPE_API_KEY` 或 `DEEPSEEK_API_KEY`（当前使用规则回退，所有基本功能均可工作）
2. **Firecrawl API Key**: 在 `.env` 中设置 `FIRECRAWL_API_KEY` 以获得云抓取（Playwright + 原生 HTTP 无需密钥即可工作）
3. **Stripe Key**: 设置 `STRIPE_SECRET_KEY` 用于真实支付处理
4. **Email Key**: 设置 `SENDGRID_API_KEY` 或 SMTP 配置
5. **PG数据库**: 取消注释 `DATABASE_URL` 以使用 PostgreSQL 替代内存数据库
6. **MCP Server**: ~~实现额外的 ~97 个工具（目前仅实现了 filesystem、sql、weather 3个）~~ ✅ 已核实为过时信息：`server.py` 已实现 **57** 个工具类、注册 **100+** 个工具（见 2026-10-11 changelog）。如需让 AI 客户端直连，可直接使用 `/mcp` 端点。

## 已知限制
- 无LLM API Key: AI 响应基于规则，无真实大模型对话
- 硬件不可用: 机器人 HAL 完全模拟
- Spring Boot JWT: SecurityConfig 存在但没有 JWT 过滤器实现
- 内容爬取: 24/26来源可工作（Poetry4Kids 和 NatGeoKids 在 Playwright 中可能超时）

## 本轮继续完善（2026-10-10）

### 1. 修复认证漏洞：密码从未被存储或校验
- **问题**: `children_auth.register_user()` 只写入 user_id/name/age/role/parent_id，未保存密码；
  `authenticate()` 也只按用户名发放令牌，**任意密码都能登录**。
- **修复**:
  - `children_persistence.py`: users 表新增 `password_hash` 列（CREATE 语句 + 幂等 `ALTER TABLE`，
    兼容已存在的 `data/system.db`）。
  - `children_auth.py`: 注册时用 `_hash_password()` 存储哈希；登录时校验哈希，错误密码返回
    `Invalid credentials`。历史遗留（无哈希）账号在首次登录时按 “trust-on-first-use” 绑定密码，
    之后正常校验，保证既有演示账号仍可登录。

### 2. 修复通知路由被遮蔽的 Bug
- **问题**: `GET /api/notifications/{user_id}` 注册在 `GET /api/notifications/stats` 与
  `/api/notifications/templates` 之前，导致后者被当作 `user_id=stats|templates` 命中，
  返回错误的通知列表结构（FastAPI 按注册顺序匹配路由）。
- **修复**: 将参数化路由移动到所有静态 `/api/notifications/*` 路由之后。

### 3. 补齐缺失的集成测试（CI/README 引用但文件不存在）
- **问题**: `.github/workflows/python-ci.yml` 与 `README.md` 均引用 `tests/test_integration.py`，
  但该文件不存在，CI 的 `integration-tests` 作业必然失败。
- **修复**: 新增 `tests/test_integration.py` —— 8 条跨模块端到端流程、共 **41** 项断言
  （认证→学习→对话/情感→内容/搜索→成长/推荐→设备/娱乐→管理/分析/安全→家长/订阅/通知/国际化），
  通过 ASGI 在进程内运行，无需启动服务器。
- `requirements-python.txt` 增加 `httpx>=0.27.0`（集成测试与 e2e 测试依赖）。

### 4. 搜索分词改进
- **问题**: 分词用 `[\w\u4e00-\u9fff]+` 匹配，`p_g1_math` 被当作单个 token，
  英文查询 `math` / `english` 永远命中不到课程。
- **修复**: 对含下划线的标识符额外拆分出子词（`p`,`g1`,`math`），英文/中文查询均可命中。

### 验证结果（本轮结束）
```
tests/test_all_unit.py     → 31/31 passed
tests/test_integration.py  → 41/41 checks passed   （新增）
tests/test_e2e_http.py     → 81/81 passed
tests/test_e2e_load.py     → 50/50 passed (0 errors)
```

## 本轮继续完善（2026-10-11）

### 5. MCP Server：实现真正的 MCP 协议端点（JSON-RPC 2.0）+ 修复 120 处崩溃路径
- **问题 1（架构）**: 模块名为 MCP Server，但 `server.py` 只有自定义 REST API
  （`/api/tools/*`、`/api/execute`），没有实现 Model Context Protocol 本身——
  Claude Desktop / Cursor 等真实 MCP 客户端**无法连接**。
- **修复 1**: 新增 `POST /mcp` 端点，完整实现 JSON-RPC 2.0 协议：
  - `initialize`（返回协议版本 `2025-06-18`、serverInfo、capabilities）
  - `tools/list`（为每个工具导出 JSON Schema `inputSchema` + capability 枚举）
  - `tools/call`（执行工具，规范返回 `content[{type:text}]` / `isError`）
  - `ping`、`resources/list`、`completion/complete`、`notifications/*`
  - 标准错误码：`-32700` 解析错误 / `-32600` 无效请求 / `-32601` 未知方法 / `-32602` 未知工具
  - `GET /mcp` 返回服务器信息与工具总数
- **问题 2（Bug）**: `ToolResult` 数据类中 `result` 是必填参数，但文件内 **120 处**
  `ToolResult(False, error=...)` 错误分支省略了 `result`，导致任何"未知 capability"
  调用都会抛 `TypeError` 崩溃（57 个工具类全部受影响）。
- **修复 2**: `ToolResult.result` 改为默认 `None`，120 个错误分支全部恢复正常返回。
- **问题 3（Bug）**: `/health` 使用 `self._start_time`，但它只在 `run()` 中初始化，
  用测试客户端（不经 run()）访问会 `AttributeError`。
- **修复 3**: 初始化移到 `__init__`。
- **安全**: `/mcp` 支持可选 API-KEY 认证（`Authorization: Bearer <key>` / `X-API-Key`），
  通过 `mcp_config.json` 的 `security.auth_required: true` 开启。
- **测试**: 新增 `tests/test_mcp_server.py` —— 18 项断言覆盖 REST + MCP 协议全流程。
  CI（`.github/workflows/python-ci.yml`）增加 `Run MCP server tests` 步骤；
  `requirements-python.txt` 增加 flask / flask-cors / requests。

### 6. 扩展 API 覆盖面：补齐管理类缺失端点（+6 端点）
- **问题**: 多个模块已实现能力但**没有路由暴露**：密码无法修改、无法读取当前用户、
  设备无法列出/注册/注销、会话无法列出/删除。
- **修复**（`children_robot_system.py` / `children_auth.py` / `children_device.py`）:
  - `GET  /api/auth/me` —— 从令牌返回当前用户资料（未认证 401）。
  - `POST /api/auth/password/change` —— 校验旧密码、写入新哈希、撤销该用户已登记会话
    （新增 `children_auth.change_password()`）。
  - `GET  /api/device` —— 列出设备（已认证）。
  - `POST /api/device/register` —— 注册设备（parent/admin，403 拦截）。
  - `DELETE /api/device/{device_id}` —— 注销设备（parent/admin，新增 `unregister_device()`）。
  - `GET  /api/conversation/sessions/{user_id}` / `DELETE /api/conversation/session/{session_id}`
    —— 会话列表与删除（已认证）。
  - 新端点使用**真实 HTTP 状态码**（401/403/404），比旧的“HTTP 200 + body code”更标准。
- **测试**: `tests/test_security_api.py` +8 断言（auth/me、密码修改全流程）；
  `tests/test_e2e_http.py` +7 端点。

### 7. Node.js：`test:all` 覆盖全部 11 个测试套件 + 新增 Node CI
- **问题**: `tests/run-all.js` 已聚合 **11** 个套件（426 断言），但从未被 `package.json`
  引用；`npm run test:all` 只链式运行 7 个文件（141 断言），漏掉
  `admin-routes`、`routes-v1`、`hardware-manager`、`content-service`、`server` 五个套件。
  仓库只有 `python-ci.yml`，Node 测试**从不自动运行**。
- **修复**:
  - `package.json`: `test:all` → `node tests/run-all.js`（426 断言，写入
    `tests/test-report.json`）；原 7 套件子集保留为 `test:core`。
  - 新增 `.github/workflows/node-ci.yml`: Node 20 + `npm install` + `npm run test:all`，
    上传测试报告 artifact。所有套件均为进程内 HTTP/supertest，无需浏览器。
- **验证**: `npm run test:all` → **426/426 passed**（11 suites）。

### 8. Flutter：修复设置无法持久化的 Bug + 补齐静态分析配置
- **问题**: `AppProvider`/`UserProvider` 通过 `Hive.box('settingsBox')` 读写设置、
  `clearCache()` 使用 `Hive.box('appBox')`，但 `main()` 只 `openBox` 了
  `userBox` 与 `deviceBox`。未打开的 box 会抛异常（被 `catch(_){}` 静默吞掉），
  导致**所有设置（主题/语言/字号/开关）永远无法保存或加载**。
- **修复**: `main.dart` 补开 `settingsBox` 与 `appBox`（`openBox` 幂等，热重载安全）。
- **补充**: 新增 `analysis_options.yaml`（`flutter_lints` + 针对历史代码的告警级别），
  此前项目无任何静态分析配置。

### 9. 开源复用 SOP／检查单 + 尽调工具（先检索复用，再造）
- **背景**: 确立"先检索复用、再造"的工作流：先别写 → 按五维度（更新时间/Star/协议/技术栈/
  部署难度）筛 → 选 3 → 判"直接用/二开" → 评成本与风险。其中**开源协议**是最易被忽略、
  最易埋雷的一项（GPL/AGPL 传染闭源）；另一风险是 AI 检索会**幻觉出仓库**或推荐**停更/有漏洞**版本。
- **新增 1（SOP）**: `project_source/docs/OPEN_SOURCE_REUSE_SOP.md`
  —— 五步流程、五维度口径、协议三档闸门（可采用/需法务确认/默认拒绝）与检查清单、
  反幻觉核验协议、直接用/二开/弃用判定规则、成本风险模板、检查单、反例与实盘示例。
- **新增 2（工具）**: `project_source/scripts/repo_check.py`（零依赖，标准库）
  - `policy`：协议政策总览
  - `eval <owner/repo>`：GitHub 事实卡（存在性/归档/活跃度/协议/评分/结论；404 即拦幻觉）
  - `search "<query>"`：GitHub 搜索候选
  - `npm` / `pypi` / `pub`：包 registry 后端（**无需鉴权**，拿"协议+最新版本+发布日期"）
  - `osv <eco>:<pkg> [ver]`：OSV.dev 漏洞核查
  - 退出码 `2` = 存在"弃用级"候选，便于 CI 卡关。
- **实盘核验（2026-10-11）**: 针对"Node 后端安全加固"需求（当前无 helmet/限流/schema 校验），
  核验候选均过协议闸门：helmet（MIT,★11k）、express-rate-limit（MIT,★3.3k）、
  zod（MIT,★44k）、express-validator（MIT,★6.2k）、joi（BSD-3,★21k）。
  Python：slowapi（MIT）、fastapi-limiter（Apache-2.0）。详见 SOP 第 10 节。
- **工具自证**: `osv npm:lodash 4.17.11` → 7 条漏洞；`osv PyPI:requests 2.19.0` → 10 条
  （证明"有漏洞版本"能被拦下）。
- **发现的坑（写入 SOP 反例）**:
  - 聚合站 `api.npms.io` 数据**冻结在 2022**（仍显示 express-rate-limit 6.7.0，实际已 v8）
    → 版本新鲜度只看包 registry / GitHub release。
  - GitHub API 未认证限流 60 次/小时（本机一度 403）→ CI 需配 `GITHUB_TOKEN`。

### 验证结果（本轮结束）
```
tests/test_mcp_server.py   → 18/18 passed   （新增）
tests/test_all_unit.py     → 31/31 passed
tests/test_integration.py  → 41/41 passed
tests/test_security_api.py → 24/24 passed  （+8）
tests/test_e2e_http.py     → 88/88 passed  （+7）
npm run test:all (Node)    → 426/426 passed （11 suites，改为聚合）
```

## 本轮继续完善（2026-10-11 · 深挖：安全中间件复用 + 修复 CRITICAL 认证绕过）

### 10. 深挖既有安全中间件：先审计自研件，再用轮子替换，并挖出认证绕过
- **背景/方法**: 按"先检索复用，再造"，本应直接加 helmet/限流。但深挖发现项目**已有自研安全中间件**
  （`middleware/security.js`、`middleware/rate-limiter.js`），于是把问题升级为"自研 vs 轮子谁更可信"。
  审计中发现的问题比"选型"本身严重得多。
- **问题 1（CRITICAL，认证绕过）**: `routes/auth.js` 的 `verifyPassword()` 在 bcrypt 校验失败后
  回退到硬编码口令 `admin123`/`parent123`/`123456` —— **任意邮箱**用这三个口令即可登录成功。
  根因：`utils/database.js` 的种子哈希是 **58 字符的非法占位串**（合法 bcrypt 为 60），
  `bcrypt.compare` 对任何口令都返回 `false`，该后门成了唯一能登录的路径。
- **修复 1**: 种子改为**真实 bcrypt 哈希**（admin→`admin123`，parent→`parent123`）；删除后门口退分支。
- **问题 2（HIGH）**: `/forgot-password` 在响应体里直接回传 `resetToken` → 可重置任意用户密码。
- **修复 2**: 生产环境不再回传（仅非生产保留，便于本地测试）。
- **问题 3（死代码 / 静默空实现）**: `bodySizeLimiter`/`injectionGuard`/`rateLimitByIp`/`noSniffJson`
  **从未在 server.js 挂载**（`MAX_BODY_SIZE` 配置实为空设）；`middleware/rate-limit.js`、`cache.js`
  是 `(req,res,next)=>next()` 的**静默空实现**（`video-call.js` 以为已限流，实际完全没有）。
- **问题 4（自研限流器缺陷）**: 滑动窗口把**秒**当毫秒又除一次 → `Retry-After`/`X-RateLimit-Reset`
  数量级错误；`getKey` 读 `req.user` 却挂在鉴权**之前** → 按用户限流从不生效；Redis 支持是空壳；
  `isAdmin` 声明未用；`blockedIPs` 无上界。
- **修复 3/4（复用决策，见 SOP §10.1）**: 用成熟轮子替换自研安全件——
  - `helmet`（MIT,★11k）替换自研 `securityHeaders`（CSP/HSTS **仅生产**开启，保持前端可用）；
  - `express-rate-limit`（MIT,★3.3k）替换自研限流器 + 空壳（`standardHeaders: 'draft-7'`）；
  - `express-validator`（MIT,★6.2k）新增，接入 `login/register/forgot-password/reset-password/change-password`；
  - **保留** `corsRestricted`（白名单 CORS，轮子不提供）；**弃用** `injectionGuard`（正则黑名单误报极高）；
  - `express.json({ limit: MAX_BODY_SIZE })` 让请求体上限真正生效；新增 `TRUST_PROXY` 受信代理开关。
- **新增测试**: `tests/security.test.js`（15 条）—— 响应头、真实哈希登录、后门关闭、校验 400、
  限流 429 + 标准头。
- **修复测试框架（诚实性）**: `tests/run-all.js` 原用 `close` 事件，Windows 上孙进程占用管道会把套件
  拖到超时被杀，且**被杀的套件被静默计为通过**（假绿）。改为 `exit` 事件 + 被杀/崩溃计入失败。
- **新增文档**: `project_source/docs/SECURITY_AUDIT.md`（完整证据与决策）；`OPEN_SOURCE_REUSE_SOP.md` 增 §10.1。
- **安装版本**: helmet 8.3.0 / express-rate-limit 8.7.1 / express-validator 7.3.2（均过协议闸门）。

### 验证结果（本轮结束）
```
tests/security.test.js     → 15/15 passed   （新增）
npm run test:all (Node)    → 441/441 passed （12 suites；原 426，+15）
tests/test_security_api.py → 24/24 passed
tests/test_all_unit.py     → 31/31 passed
tests/test_mcp_server.py   → 18/18 passed
tests/test_integration.py  → 41/41 passed
```

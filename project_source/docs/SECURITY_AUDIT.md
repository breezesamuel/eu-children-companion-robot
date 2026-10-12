# 安全审计与中间件复用决策（Node/Express 后端）

> 时间：2026-10-11　范围：`project_source/`（Express 后端）　核验方式：代码走读 + 可复现脚本 + 回归测试。
> 关联：`docs/OPEN_SOURCE_REUSE_SOP.md` §10、根目录 `PROJECT_FIXES.md`。
> 一句话结论：**先用成熟开源件（helmet / express-rate-limit / express-validator）替换自研安全中间件；
> 但在替换过程中挖出一个比"复用选型"严重得多的 CRITICAL 认证绕过漏洞，已一并修复。**

---

## 1. 背景：为什么先审计而不是直接加依赖

按"先检索复用，再造"的 SOP，原计划是给 Express 后端补上安全响应头、限流、schema 校验。
但深挖发现：**项目其实已经有一套自研安全中间件**（`middleware/security.js`、`middleware/rate-limiter.js`）。
因此正确的"复用"动作不是盲目叠加依赖，而是先回答：**自研 vs 现成轮子，谁更可信？**

走读结论：自研件里既有真实缺陷，也有**看起来生效、实则从未挂载**的死代码。

---

## 2. 发现清单（按严重度）

| # | 严重度 | 位置 | 问题 | 状态 |
|---|---|---|---|---|
| S1 | **CRITICAL** | `routes/auth.js` `verifyPassword()` | 硬编码口令后门：`bcrypt` 校验失败后，任何账号只要密码是 `admin123`/`parent123`/`123456` 即登录成功 → **认证绕过** | ✅ 已修复 |
| S2 | HIGH | `routes/auth.js` `/forgot-password` | 响应体直接回传 `resetToken`（生产环境也是）→ 任意人可重置他人密码 | ✅ 已修复 |
| S3 | MEDIUM | `routes/auth.js` MFA 校验 | `code === '000000' \|\| code.length === 6`：任意 6 位数字通过；`/login/mfa`、`/mfa/verify` 同问题 | ⚠️ 已记录，待修 |
| S4 | MEDIUM | `middleware/security.js` | `bodySizeLimiter`/`injectionGuard`/`rateLimitByIp`/`noSniffJson` 已定义并导出，但**从未在 server.js 挂载**；`MAX_BODY_SIZE` 配置实为空设 | ✅ 已修复/标注 |
| S5 | MEDIUM | `middleware/rate-limit.js`、`middleware/cache.js` | 均为静默空实现 `(req,res,next)=>next()`；调用方（如 `video-call.js`）以为已限流，实际**完全没有** | ✅ rate-limit 修复 |
| S6 | MEDIUM | `middleware/rate-limiter.js` | 自研限流器多处缺陷（见 §3） | ✅ 由 express-rate-limit 取代 |
| S7 | LOW | `middleware/security.js` | `X-XSS-Protection` 已废弃；CSP 含 `unsafe-inline`；`Allow-Credentials: true` 与 `Allow-Origin: *` 组合非法；`Permissions-Policy` 硬编码 `localhost` | ✅ 由 helmet 取代/修正 |
| S8 | LOW | `middleware/security.js` | 正则黑名单式注入检测误报极高（`fetch(`、`alert(`、`window.location`、`SELECT ... FROM` 都会命中正常内容） | ✅ 未启用（保持不挂载） |
| S9 | MEDIUM | `server.js` 静态目录 | `express.static('docs')` 把 `docs/` 下的**内部文档**（`SECURITY_AUDIT.md`、`BUGFIX_REPORT.md`、`RESTORATION_INFO.md`…）公开可下载 | ✅ 已修复 |

---

## 3. 关键证据

### S1 认证绕过（CRITICAL）

种子用户的口令哈希是一个 **58 字符的占位串**（合法 bcrypt 为 60 字符）：

```
$2b$10$EixZaYbB.rK4fl8x2q7Meu6Q6D2V5fF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q   // 长度 58，非法
```

实测（`bcryptjs`）：

```
seedHash length = 58 (valid bcrypt = 60)
compare(parent123) => false
compare(admin123)  => false
compare(123456)    => false
realHash(parent123) length = 60 compare => true
```

也就是说：**种子账号用任何密码都登不进**——这正是后门存在的原因。
后门 `if (password === 'admin123' || ...) return true;` 让**任意邮箱**都能用这三个口令登录，且**不校验真实哈希**。

修复：`utils/database.js` 换成真实 bcrypt 哈希（admin→`admin123`，parent→`parent123`），
移除 `verifyPassword` 的回退分支。回归用例见 `tests/security.test.js`（含"已有账号 + 后门口令必须 401"）。

### S6 自研限流器的真实缺陷

- `setHeaders` 里 `resetTime > 1e12` 才按毫秒处理；滑动窗口传的是**秒**，于是又被 `/1000`，
  导致 `X-RateLimit-Reset` / `Retry-After` 数量级错误（常为 0 或负数）；固定窗口却传毫秒 → 单位前后不一致。
- `getKey` 读 `req.user`，但限流器挂在鉴权**之前**，`req.user` 恒为 `undefined` → 按用户限流**从不生效**。
- `setRedis()` 设了 `useRedis`，但主流程**没有任何 Redis 分支** → Redis 支持是空壳。
- `isAdmin` 变量声明后从未使用；`analytics.blockedIPs` 无上界增长。
- 并发键用 `req.correlationId`，但该字段由 `monitoringMiddleware` 设置，而它挂在限流器**之后** → 恒为 `undefined`。

### S4/S5 死代码与空实现

- `grep` 全仓仅 `server.js` 引用 `securityHeaders`/`corsRestricted`/`rate-limiter`；
  `bodySizeLimiter`/`injectionGuard`/`rateLimitByIp`/`noSniffJson` 在 `security.js` 之外**零引用**。
- `middleware/rate-limit.js` 原为 `(req,res,next)=>next()`；被 `backend/api/v1/video-call.js` 使用。

---

## 4. 复用决策（对应 SOP §5：直接用 / 二开 / 弃用）

| 能力 | 原实现 | 决策 | 理由（协议均为宽松） |
|---|---|---|---|
| 安全响应头 | 自研 `securityHeaders` | **换 helmet**（MIT，★11k） | drop-in、默认值正确且持续维护；自研件含废弃头 |
| 接口限流 | 自研 `rate-limiter.js` + 空壳 `rate-limit.js` | **换 express-rate-limit**（MIT，★3.3k） | 修掉单位/键/Redis 缺陷；standard headers |
| 请求校验 | 无 | **加 express-validator**（MIT，★6.2k） | Express 中间件风格最顺手；用于 auth 高危路由 |
| CORS 白名单 | 自研 `corsRestricted` | **保留自研** | helmet/express-rate-limit 都不提供；改造成本 > 收益 |
| 请求体大小 | `bodySizeLimiter`（未挂载） | **用 `express.json({ limit })`** | 复用框架内建能力，删掉死代码 |
| 注入黑名单 | `injectionGuard`（未挂载） | **弃用（保持不挂载）** | 正则误报极高；参数化查询才是正道 |

> 保留的既有标准件：`cors`（MIT）、`bcryptjs`、`jsonwebtoken`、`uuid`。

安装并锁定的版本（2026-10-11，registry.npmjs.org 实测）：

```
helmet = 8.3.0
express-rate-limit = 8.7.1
express-validator = 7.3.2
```

---

## 5. 落地改动

- `server.js`：`securityHeaders`→`helmet(...)`（CSP/HSTS **仅生产**开启，保持既有前端可用）；
  `rateLimiter`→`express-rate-limit`（`standardHeaders: 'draft-7'`）；新增受信代理开关 `TRUST_PROXY`；
  `express.json({ limit: MAX_BODY_SIZE })` 真正生效；`Permissions-Policy` 修正去掉硬编码 localhost；保留 `corsRestricted`。
- `server.js`：新增静态资源守卫，禁止通过 HTTP 读取 `docs/` 下的 `.md/.txt/.log/.yml/.env/.bak`
  等内部文件（`docs/` 同时也是前端静态资源目录），只放行真正的网页资源。
- `routes/auth.js`：移除口令后门（S1）；生产环境不再回传 `resetToken`（S2）；
  在 `register/login/forgot-password/reset-password/change-password` 上接入 express-validator。
- `utils/database.js`：种子哈希换为真实 bcrypt 值。
- `middleware/rate-limit.js`：空实现→`express-rate-limit` 封装（兼容旧 `max` 选项）。
- `middleware/security.js`：顶部标注各函数状态（ACTIVE / SUPERSEDED / NOT MOUNTED）。
- `tests/security.test.js`：新增 15 条安全回归（响应头、真实哈希登录、后门关闭、校验 400、限流 429 + 标准头）。
- `tests/run-all.js`：修复聚合器在 Windows 上因孙进程占用管道而"误杀并静默判过"的问题
  （改用 `exit` 事件；被杀的套件计入失败，不再假绿）。

---

## 6. 回归证据

| 套件 | 结果 |
|---|---|
| Node `npm run test:all`（12 套件） | **441 / 441 passed，0 failed** |
| Node `tests/security.test.js`（新增） | 15 / 15 |
| Python `tests/test_security_api.py` | 24 / 24 |
| Python `tests/test_all_unit.py` | 31 / 31 |
| Python `tests/test_mcp_server.py` | 18 / 18 |
| Python `tests/test_integration.py` | 41 / 41 |

---

## 7. 遗留与建议（未在本轮修复）

1. **S3 MFA**：`code === '000000' || code.length === 6` 应改为逐用户校验 TOTP（`otplib`，MIT，需过恰好协议+OSV 核验）。
2. **未挂载的安全工具**：`injectionGuard` 等要么删除、要么真正接入；当前状态是"看着安全、实则没有"的隐患。
3. **未用导入**：`middleware/cache.js` 被 4 个文件 `require` 但从未调用（它们改用了本地 `setCache`），建议清理为真实缓存（`lru-cache`，ISC，过核验后）或删除。
4. **双 CORS**：`server.js` 同时用 `cors()`（宽松默认）与 `corsRestricted`（白名单）。为不破坏"默认放行"行为本轮保留；建议后续统一到一处并补齐 `Vary: Origin`。
5. **无分布式存储的限流**：单进程内存限流在多实例部署下不共享；水平扩容前需接入 Redis store。

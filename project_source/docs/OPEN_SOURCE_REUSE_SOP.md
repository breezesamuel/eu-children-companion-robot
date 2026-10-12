# SOP — 「先检索复用，再造」开源选型检查单

**版本：** 1.0  
**生效：** 2026-10-11  
**适用范围：** 所有第三方依赖/开源组件的引入、升级、替换  
**Owner：** 平台组 + 法务合规  
**强制执行：** `scripts/repo_check.py`（CI 门禁，违规即 fail）

---

## 0. 为什么要有这份 SOP

> "让 AI 找轮子"最常见的三类事故，本 SOP 全部有硬性拦截：

| 事故 | 真实案例（本项目实测，2026-10-11） | 拦截层 |
|------|-----------------------------------|--------|
| **记忆幻觉**：模型"记得"是 MIT，实际不是 | `@vendure/core` — 记忆 = MIT，**实测 = GPL-3.0-OR-LATER** | §2 协议闸门 |
| **记忆幻觉**：以为早已开源 | `nocodb` — 记忆 = AGPL，**实测 = SUSTAINABLE USE LICENSE**；`directus` 记忆 = Apache，**实测 = BSL-1.1** | §2 协议闸门 |
| **凭空仓库名** | 同一轮检索中我写出了 4 个不存在的仓库名（API 全部 404） | §1 可解析性 |
| **停更/有漏洞** | `otpauth` <3.2.8 `totp.validate()` 接受**单位数 token** → 认证绕过（GHSA-rmmc-8cqj-hfp3） | §3 成熟度 + §4 漏洞 |

**核心原则：宁可不用，不可错用。任何一项不通过 = 不引入。**

---

## 1. 第一步：先别写

- [ ] **写下需求的一句话定义**（例："需要商品上架与草稿发布能力"），禁止用"我需要一个 CMS"这种方案语言描述。
- [ ] **确认这确实该用轮子**：以下情况**自己写**，不检索：
  - 少于 50 行且无安全/并发/协议语义
  - 核心商业机密逻辑
  - 已有依赖可直接覆盖（例：`express.json({limit})` 优于自研 body-limiter）
- [ ] **在项目内先搜一遍**（`routes/`、`services/`、`utils/`、`package.json`），避免重复造轮子或引入重复能力。

---

## 2. 第二步：五维筛选（硬性闸门）

### 2.1 协议闸门（最高优先级，一票否决）

**允许名单（宽松许可，可商用可闭源分发）：**

```
MIT / MIT-0 / Apache-2.0 / BSD-2-Clause / BSD-3-Clause /
ISC / 0BSD / Unlicense / CC0-1.0 / Zlib / PostgreSQL License
```

**拒绝名单（传染性 / 源码可见但非 OSI / 网络服务条款）：**

```
GPL-2.0 / GPL-3.0 / LGPL-2.1 / LGPL-3.0 / AGPL-3.0 /
SSPL-1.0 / BSL-1.1 / BUSL-1.1 / Elastic-2.0 / OSL-3.0 /
EUPL-1.2 / CC-BY-NC-* / MPL-2.0 / NCSA / Proprietary
```

**⚠️ 判定铁律（三条全部必须满足）：**

1. **`unknown → deny`**：协议字段为 `None`、`NOASSERTION`、`"SEE LICENSE IN LICENSE"`、`"SUSTAINABLE USE LICENSE"` 等，**一律拒绝**，直到人工读取 LICENSE 全文确认为止。
2. **`not exactly on allow-list → deny`**：例如 `MIT-0` 需单独确认（更宽松，允许但需在 §6 登记）；`"SUSTAINABLE USE LICENSE"` 不在名单即拒。
3. **禁止凭记忆填协议**：必须来自 `npm view <pkg> license --json` / PyPI JSON API / GitHub `/repos/{repo}/license` 端点。模型说"这是 MIT"**不是证据**。

**协议以外还要做的检查：**
- [ ] **NOTICE / 归属要求**：如 `react`（MIT）需在 `NOTICE` 中保留归属；sedona 类库需检查 `third-party-licenses`。
- [ ] **专利条款**：Apache-2.0 含显式专利授权（加分项）；MIT 无专利条款（记录在案）。
- [ ] **商标**：多数 MIT/Apache 不授予商标权 — **品牌名、logo、产品名不得沿用**。
- [ ] **附加限制**：检查是否有 `CLA` 要求或"不得用于竞品"条款。

### 2.2 成熟度闸门（Star / 更新）

- [ ] **GitHub Star ≥ 2,000**（非 UI 工具类放宽至 ≥ 1,000，并记录理由）。
- [ ] **最近 30 天内有 commit 或 release**（`pushed_at` / `time.modified`）。
- [ ] **超过 24 个月未更新 → 拒**（除非是我们 fork 后自己维护，且已评估维护成本）。
- [ ] **未归档**（`archived = true` → 拒）。
- [ ] **有真实采用案例**（生产环境使用者，非只有 demo）。
- [ ] **文档完整**（README + CHANGELOG + 迁移指南）。

### 2.3 技术栈契合闸门

- [ ] **运行时兼容**：Node ≥ 20 / Python ≥ 3.11（本项目基线）。
- [ ] **可移植到目标硬件**：RK3588 / ESP32-S3（需能在 ARM64 Linux 运行）。
- [ ] **依赖体积**：`npm ls --all --omit=dev` 后新增依赖树 ≤ 50 包。
- [ ] **无重量级 peer 依赖冲突**（尤其 React 版本、fastify vs express）。
- [ ] **TypeScript 类型可用**（或包 `@types/*` 质量合格）。

### 2.4 部署与运维难度闸门

- [ ] **无需额外服务**：若需要 Redis/PG/外部服务，必须明确登记到 `docker-compose.yml` 与 Terraform。
- [ ] **无需要 root / 特权容器**。
- [ ] **镜像可瘦身**：多阶段构建后 ≤ 500 MB。
- [ ] **有健康检查端点**（`/health/live`、`/health/ready` 或等价）。
- [ ] **可观测**：暴露 `/metrics`（Prometheus）或可接 OpenTelemetry。
- [ ] **优雅停机**：支持 SIGTERM 排空。

### 2.5 漏洞闸门

- [ ] `npm audit --audit-level=high` / `pip-audit` / **OSV-Scanner** 全部通过。
- [ ] **查证历史 CVE 的修复版本**，确认当前版本 ≥ 修复版本（例：`otpauth` 必须 ≥ 3.2.8）。
- [ ] 若为安全敏感组件（认证、加密、解析），**额外人工评审 + 渗透测试**。
- [ ] 纳入 **Dependabot / Renovate** 自动跟踪。

---

## 3. 第三步：选 3 个

- [ ] 对同一需求至少比较 **3 个候选**，按五维打分，**禁止只找一个就用**。
- [ ] 输出对比表（含每个候选的协议原文引用、Star、最后更新、依赖数）。
- [ ] 明确记录"为什么是它而不是另外两个"。

### 本轮（2026-10-11）商业化链路选型结果

| 需求 | 候选 1 | 候选 2 | 候选 3 | 选定 |
|------|--------|--------|--------|------|
| 内容官/上架/入库 CMS | **Payload**（MIT, v3.90.2） | Strapi（自定义许可，未入选） | Directus（BSL-1.1，拒） | **Payload** |
| 数据闭环/自进化 A/B | **PostHog**（MIT, v5.55.1） | Umami（MIT） | Matomo（GPL，拒） | **PostHog-node** |
| 外联/跟进通知 | **Novu**（MIT, v2.6.6） | Activepieces（待复检） | n8n-workflow（fair-code，拒） | **Novu** |
| 任务编排 | **BullMQ**（MIT, v6.3.12） | Bull（MIT, v4.16.5） | — | **BullMQ**（Redis Cluster，已有 Redis） |

**被拒的"重量级"（记录在案，供后续复用）：** Vendure（GPL-3.0）、Medusa（BSL）、Directus（BSL）、NocoDB（SUL）、n8n（fair-code）、Odoo（LGPL）、ERPNext（GPL）、Spree（AGPL）、Firecrawl 自托管（AGPL）、Matomo（GPL）。

---

## 4. 第四步：判"可直接用 / 需二开"

对选定组件逐项标注：

| 判定标准 | 结论 |
|----------|------|
| **可直接用**：npm/pip 装上即可，无需改源码 | 例如 `pdfkit`、`bullmq`、`crawlee` |
| **需二开（轻）**：包一层 adapter，不做 fork | 例如 `posthog-node`（统一 SDK + 隐私字段白名单） |
| **需二开（重）**：fork + 补丁，且承担合并上游成本 | 需 CTO 审批 |
| **仅参考实现**：读代码/架构，自己写 | 需在设计文档中引用出处 |

**禁止事项：**
- 禁止 `node_modules` 内 `patch-package` 长期打补丁而不提 PR 或记录 fork 原因。
- 禁止 fork 后不建"上游同步"任务（季度一次）。

---

## 5. 第五步：评估改造成本与风险

### 5.1 成本量化表（每个依赖填写）

```
包名 / 版本 / 协议：
安装体积：
新增传递依赖数：
适配工作量（人日）：
测试工作量（人日，含合规用例）：
文档工作量（人日）：
合计（人日）：
```

### 5.2 风险登记册

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 上游停更 | 中 | 锁定版本；季度检查；准备替换方案 |
| 上游改许可 | **高** | CI 监控 license 变化（`npm view license` → 比对白名单）；变更即告警 |
| 安全漏洞 | 高 | OSV + Dependabot + 30 天修复 SLA |
| 传染性污染 | **致命** | §2.1 闸门 + 法务年度复核 |
| 体积膨胀 | 低 | 依赖树 ≤ 50 包门禁 |
| 上游 breaking change | 中 | 锁定 minor；升级走 RFC + 完整回归 |

---

## 6. 登记与合规（必须留痕）

引入/升级依赖时，**必须**同步更新：

1. `package.json` / `requirements.txt`（锁版本，禁止 `^` 用于安全相关组件）。
2. **`THIRD_PARTY_NOTICES.md`**（自动生成 + 人工复核）：包名、版本、协议、版权声明、链接。
3. **SBOM**（CI 生成 CycloneDX JSON，归档 90 天）。
4. `docs/sop_reuse_audit.json`（本 SOP 的审计输出）。
5. 若为"需二开"，在设计文档记录 fork/补丁原因与负责人。

---

## 7. CI 自动化（已在 `.github/workflows/ci.yml` 落地）

| 门禁 | 工具 | 失败条件 |
|------|------|----------|
| 依赖漏洞 | `osv-scanner` + `npm audit --audit-level=high` | 发现 high/critical |
| 协议闸门 | `scripts/repo_check.py` → `scripts/sop_license_gate.py`（读**已安装产物**：npm `node_modules/*/package.json` + Python `importlib.metadata`；按 SPDX `AND`/`OR` 语义判定；`unknown → deny`） | 出现白名单外协议（`scripts/sop_exceptions.json` 中**未过期**豁免除外；**过期例外同样 fail**） |
| 密钥泄漏 | `trufflehog` | 检出任何 secret |
| SBOM 生成 | `syft` → CycloneDX | 生成失败 |
| 依赖体积 | `npm ls --all --omit=dev` 包数比对 | 超出基线 +50 包 |
| 更新 staleness | `npm view time.modified` | > 24 个月 |
| DPIA 存在性 | grep `DPIA.md` | 文件缺失 |

---

## 8. 快速自检表（贴工位）

```
□ 我写下了需求的一句话定义，且没写"我需要 XXX 框架"
□ 我在项目内搜过，确认没有现成能力
□ 我选择了 ≥3 个候选并做了五维对比
□ 协议来自权威源（npm/PyPI/GitHub API），不是我的记忆
□ 协议在白名单内；unknown / SEE LICENSE / SUSTAINABLE 一律拒绝
□ NOTICE / 专利 / 商标条款已检查
□ Star ≥ 2k，最近 30 天有更新，> 24 个月未更新则拒绝
□ npm audit / OSV / pip-audit 全部通过
□ CVE 修复版本已核对
□ 技术栈兼容（Node 20+ / Python 3.11+ / ARM64）
□ 无需特权容器，可健康检查，可观测
□ 依赖树增量 ≤ 50 包
□ "直接用 / 轻二开 / 重二开 / 仅参考"已明确标注
□ 成本（人日）已量化
□ 风险登记册已填
□ THIRD_PARTY_NOTICES.md / SBOM / lockfile 已更新
□ 安全相关组件已做人工评审
```

---

## 9. 历史决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-10-11 | helmet 替代自研 `securityHeaders` | MIT，8.3.0，活跃，避免维护 |
| 2026-10-11 | express-rate-limit 替代自研 `rate-limiter` | MIT，8.7.1，标准 draft-7 头 |
| 2026-10-11 | express-validator 用于 auth 路由校验 | MIT，7.3.2 |
| 2026-10-11 | **otplib 选用；otpauth 拒绝** | otpauth 有 GHSA-rmmc-8cqj-hfp3（单位数 token 认证绕过，<3.2.8） |
| 2026-10-11 | **Vendure 拒绝** | GPL-3.0-OR-LATER，传染性 |
| 2026-10-11 | **Medusa 拒绝** | BSL（"SEE LICENSE IN LICENSE"），非 OSI |
| 2026-10-11 | **Directus 拒绝** | BSL-1.1 |
| 2026-10-11 | **NocoDB 拒绝** | SUSTAINABLE USE LICENSE |
| 2026-10-11 | **n8n-workflow 拒绝** | fair-code 持续使用许可 |
| 2026-10-11 | **选用 Payload（MIT）** | 内容官/上架/入库，Node/TS 同栈 |
| 2026-10-11 | **选用 posthog-node（MIT）** | 数据闭环 + 自进化 A/B |
| 2026-10-11 | **选用 @novu/node（MIT）** | 外联/跟进通知基础设施 |
| 2026-10-11 | **选用 bullmq（MIT）** | 任务编排，复用已有 Redis |

---

## 10. 维护

- **复核周期**：每季度一审 SOP 白名单；每年一次法务复核。
- **审计脚本**：`scripts/sop_audit*.py` / `scripts/repo_check.py`。
- **审计输出**：`docs/sop_reuse_audit.json`。
- **下次复审**：2027-01-11。

### 10.1 自动化工具清单（本 SOP 的执行体，2026-10-12 落地）

| 脚本 | 职责 | 备注 |
|------|------|------|
| `scripts/sop_license_gate.py` | 协议闸门唯一实现。字典形态（`spdx_id`/`type`/`name`）、License 全文指纹、SPDX `AND/OR` 语义、标点归一化；`unknown/空/NOASSERTION → DENY` | 纯标准库，可单测 |
| `scripts/repo_check.py` | CI 硬门禁：从 `project_source/package.json` + `requirements.txt` 取**直接依赖**，从已安装产物解析协议并判定；`--deep` 扫全部；`--json` 存证 | 退出码非零即 fail |
| `scripts/sop_exceptions.json` | 时间盒豁免登记（reason/owner/remediation/expires）。过期即 fail，不做静默豁免 | 每次 CI 都会打印在案债务 |
- `scripts/github_hunter.py`：24/7 开源发现（五维筛选；协议为硬闸门）。`--offline` 用内置样本，可无网测试；在线走 GitHub Search API。
- `scripts/sop_discovery.py`：五维筛选**执行器**（`--category` 指定领域、`--offline` 走缓存）。对候选集逐一从 **npm registry / PyPI / GitHub API** 拉权威事实（协议、版本、更新、Star），套 `sop_license_gate` 硬闸门，输出 `scripts/docs/sop_discovery.json`；缓存只存蒸馏事实（`scripts/docs/sop_discovery_cache.json`），支持 `GITHUB_TOKEN` 提升限流。
- `scripts/autonomous_ops.py`：7 阶段闭环编排器（采集→定价→路由→物流→售后→自学习→自进化），把真实business事件写入 `children_data_loop`。

---

## 11. 存量整改（自动闸门发现的真实违规）

> 本节由 `scripts/repo_check.py` 首次全量运行（2026-10-12）产出，所有协议均来自权威源，非记忆。

| 包 | 生态 | 协议（权威源） | 处置 | 状态 |
|----|------|---------------|------|------|
| `tqdm` | Python | `MPL-2.0 AND MIT`（`importlib.metadata`） | **未使用**，已从 `requirements.txt` 移除 | ✅ 已修复 |
| `@andresaya/edge-tts` | npm | `GPL-3.0-only`（`npm view` + 已装 `package.json` 双向核验） | **已替换**为 `tts_engines.js` 宽松许可引擎栈（`msedge-tts` MIT 主 / `node-edge-tts` MIT 备），依赖与豁免均已移除 | ✅ 已修复 |

**`@andresaya/edge-tts` 整改闭环（2026-10-12）：** 按 §3 比较 4 个候选（`npm view` 权威核验）：`msedge-tts`=MIT、`node-edge-tts`=MIT（通过）、`edge-tts`=CC-BY-NC-SA-4.0（非商用，拒绝）、`@andresaya/edge-tts`=GPL-3.0-only（拒绝）。新增 `project_source/services/tts_engines.js` 适配层：仅加载宽松许可引擎，未安装时优雅降级（与产品功能零耦合）。实测 `speak()` 经 `msedge-tts` 反向合成真实 37,440 字节 MP3。豁免条目已从 `scripts/sop_exceptions.json` 转入 `closed`，`scripts/repo_check.py` 硬门禁确认无 GPL 依赖、无豁免债务。

**顺带修复：** `project_source/services/tts.js` 的 `speakToStream()` 引用了未定义的 `full` 变量（应为 `audioBuffer`），已修复。

---

## 12. 历史决策记录（续）

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-10-12 | 落地 `scripts/sop_license_gate.py` 作为唯一协议闸门 | 避免多处 allow/deny 漂移；支持 SPDX `AND`/`OR` 与 LICENSE 全文指纹 |
| 2026-10-12 | `scripts/repo_check.py` 接入 CI（`security-license` job）| 把 §7 的"协议闸门"从文档变为可执行硬门禁 |
| 2026-10-12 | 引入 `scripts/sop_exceptions.json` 限时豁免机制 | 存量违规**可见可追**，而非静默绕过；过期即 fail |
| 2026-10-12 | 移除 `tqdm`（MPL，未使用）| 直接消除一处 MPL 违规，零功能影响 |
| 2026-10-12 | 落地 `scripts/sop_discovery.py`（五维筛选执行器）| 把"先别写→五维筛→选3→判定→评估"从口头流程变成可复跑、带权威源证据的工具；结果写 `scripts/docs/sop_discovery.json` |
| 2026-10-12 | 替换 `@andresaya/edge-tts`（GPL-3.0-only）为 `tts_engines.js` 宽松许可适配层 | 闭环 §11 存量整改：移除 GPL 依赖与豁免，实测 MIT 引擎真实合成 MP3 |


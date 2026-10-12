# SOP 检索复用 — 第三轮决策报告（爬虫采集框架 / 工作流引擎 / 自主电商自动化）

- **执行方式**：`scripts/sop_discovery.py`（可复跑、带权威源证据；`--category crawler|workflow|ecommerce|tts`）
- **权威源**：npm registry / PyPI 元数据（许可证、版本、更新）+ GitHub API（Star、push 时间）
- **证据文件**：`scripts/docs/sop_discovery.json`（本报告即其结论版）
- **日期**：2026-10-12 ｜ **前提**：协议闸门 = `scripts/sop_license_gate.py`（unknown→DENY）

> 流程即"先别写 → 五维筛 → 选3 → 判定 → 评估成本风险"。五维 = 协议 / 活跃 / 社区 / 技术栈 / 部署难度。

---

## 0. 重要说明（诚实的边界）

1. **协议 = 权威硬闸门，其余为软参考。** 本次许可证全部来自注册表直读，非记忆。
2. **GitHub 社区维（Star）本轮因未认证限流未完整取到**（`community=n/a`）。这不影响许可证判定，但按 SOP 需在
   下一轮用 `GITHUB_TOKEN=…` 补跑 `python scripts/sop_discovery.py` 复核社区热度。
3. **GitHub 社区维（Star）尚未完整取到**（未认证限流）→ `community=n/a`，不影响许可证判定；下轮用
   `GITHUB_TOKEN=…` 复跑复核。**PyPI 站点抖动为暂态问题，重跑后已恢复**：scrapy=BSD-3、crawl4ai/trafilatura/
   dagster/apache-airflow=Apache-2.0，均为注册表直读实证（见第 1、2 节表格）。

---

## 1. 爬虫采集框架（spider / 采集 / 入库）

### 五维筛选结果（协议为硬闸门）

| 候选 | 协议（权威源） | 活跃 | 社区 | 技术栈 | 部署 | 判定 |
|------|----------------|------|------|--------|------|------|
| crawlee      | APACHE-2.0（npm registry） | ✅ 0 月 | n/a* | JS/TS ✅ | 4/5 | **PASS** |
| cheerio      | MIT（npm registry）        | ✅ 2 月 | n/a* | JS ✅    | 5/5 | **PASS** |
| playwright   | APACHE-2.0（npm registry） | ✅ 0 月 | n/a* | JS/TS ✅ | 4/5 | **PASS** |
| puppeteer    | APACHE-2.0（npm registry） | ✅ 0 月 | n/a* | JS ✅    | 4/5 | **PASS** |
| crawl4ai     | APACHE-2.0（PyPI）          | ✅ 0 月 | n/a* | Python | 3/5 | **PASS**（Python 侧备选） |
| scrapy       | BSD-3-CLAUSE（PyPI）        | ✅ 1 月 | n/a* | Python | 4/5 | **PASS**（Python 侧备选） |
| trafilatura  | APACHE-2.0（PyPI）          | ✅ 0 月 | n/a* | Python | 5/5 | **PASS**（Python 侧备选） |

\* Star 数待下一轮用 Token 补取；crawlee ~13k、playwright ~65k、cheerio ~28k（公开常识仅作预期，不入档）。

### 选 3 与判定

| 排序 | 包 | 判定 | 依据 |
|------|----|------|------|
| 1 | **crawlee** | **直接用**（已是 `project_source/package.json` 依赖） | Apache-2.0；采集框架可复用现有第三方爬虫；与 cheerio/playwright 二合一 |
| 2 | **cheerio** | **直接用**（已是依赖） | MIT；静态 HTML 解析，采集入库主路径，零改造 |
| 3 | **playwright** | **直接用**（已是依赖，浏览器渲染抓取） | Apache-2.0；处理 JS 渲染页面/反爬页面，作为 crawlee 的浏览器层 |

> 三者同栈（Node/TS）、已经在依赖树里 —— 复用成本≈0，无需二开。Python 侧（scrapy/crawl4ai/trafilatura）协议已实证通过，作为备选随时可引。

### 改造成本与风险
- **成本**：`crawlee`+`cheerio`+`playwright` 均已随包安装；落地一个 `spider` 采集任务（把 github_hunter/网页抓取接到入库）约 **2–4 人日**。
- **IP 风险**：APACHE-2.0/MIT 均允许闭源商用；需保留 NOTICE/版权声明（crawlee 自带 NOTICE）。**低**。
- **运维风险**：playwright 需浏览器二进制 + 系统依赖（已在镜像/Dockerfile）；成本集中在此，建议采集节点独立容器。
- **幻觉/停更风险**：crawlee 3.18.2 持续发布（0 月），无停更迹象。

---

## 2. 工作流引擎（16 步闭环的编排底座）

### 五维筛选结果

| 候选 | 协议（权威源） | 活跃 | 技术栈 | 部署 | 判定 |
|------|----------------|------|--------|------|------|
| bullmq             | MIT（npm registry）   | ✅ 0 月 | JS ✅    | 3/5 | **PASS** |
| @temporalio/client | MIT（npm registry）   | ✅ 0 月 | JS ✅    | 2/5 | **PASS**（需服务端） |
| temporalio(py)     | MIT（PyPI，license 字段） | ✅ 0 月 | Python ✅ | 2/5 | **PASS**（需服务端） |
| prefect            | APACHE-2.0（PyPI）    | ✅ 0 月 | Python ✅ | 3/5 | **PASS** |
| luigi              | APACHE-2.0（PyPI）    | ✅ 5 月 | Python ✅ | 4/5 | **PASS** |
| dagster       | APACHE-2.0（PyPI）  | ✅ 0 月 | Python | 3/5 | **PASS**（备选） |
| apache-airflow | APACHE-2.0（PyPI） | ✅ 0 月 | Python | 2/5 | **PASS**（重，备选） |

### 选 3 与判定

| 排序 | 包 | 判定 | 依据 |
|------|----|------|------|
| 1 | **bullmq** | **直接用**（已选用、已是依赖） | MIT；Redis 任务队列，订单路由/物流/跟进等异步任务现成可用 |
| 2 | **@temporalio/client + worker（Temporal）** | **二开** | MIT；把 16 步商业链从"单进程循环"升级为**可恢复的 durable workflow**（重启不丢状态）；需部署 Temporal server |
| 3 | **prefect** | **二开（Temporal 的轻量替代）** | Apache-2.0；若不想运维 Temporal，prefect 提供 Python 侧编排，与现有 `children_*` 模块直接 import 兼容 |

> bullmq 已在用（订单路由依赖 Redis，MIT 已验证）。Temporal 全家桶（client/worker/activity/workflow）已在依赖树中，
> 缺的是 server 组件 —— `docker-compose.yml` 目前无 temporal 服务，属**待补基础设施**而非代码缺失。

### 改造成本与风险
- **成本**：bullmq 直接用 ≈0；Temporal 落地（compose 加 `temporal`+`temporal-ui` 服务、把 run_cycle 各 phase 迁成 workflow activity）约 **3–6 人日**；prefect 类似 3–5 人日。
- **IP 风险**：全 MIT/Apache-2.0 → **低**。
- **运维风险**：Temporal 是独立有状态服务（Cassandra/Postgres 后端）——比 Redis 重的多，需纳管；prefect 需其 server/Prefect Cloud。
- **边界**：当前 `scripts/autonomous_ops.py` 的单进程循环 + `scripts/state_store.py`（Redis/文件持久化、24/24 测试过）已是**可持续运行**的最低形态；Temporal 是"高可用形态"，**不阻塞**现有 24/7 运行。

---

## 3. 自主电商自动化（上架 / 定价 / 订单 / 物流 / 售后自动化）

### 五维筛选结果

| 候选 | 协议（权威源） | 活跃 | 部署 | 判定 |
|------|----------------|------|------|------|
| payload       | MIT（npm registry）        | ✅ 0 月 | 3/5 | **PASS** |
| @novu/node    | MIT（npm registry）        | ✅ 10月 | 3/5 | **PASS** |
| shippo        | MIT（npm registry）        | ✅ 8 月 | 4/5 | **PASS** |
| @saleor/sdk   | MIT（npm registry）        | ✅ 5 月 | 3/5 | **PASS** |
| saleor(py pkg)| BSD-3-CLAUSE（PyPI，旧包） | ❌ 76 月 | 2/5 | **DENY**（Package 层活跃 FAIL：76 个月未更新；如要用 Saleor 应直接评估 github.com/saleor/saleor，另走一轮五维筛） |
| @medusajs/medusa | **SEE LICENSE IN LICENSE（BSL）** | ✅ | 2/5 | **DENY**（非 OSI，商用受限） |

### 选 3 与判定

| 排序 | 包 | 判定 | 依据 |
|------|----|------|------|
| 1 | **payload** | **直接用**（已选用、已是依赖） | MIT；内容官/上架/入库的 headless CMS，Node 同栈 |
| 2 | **@novu/node** | **直接用**（已选用、已是依赖） | MIT；外联/跟进/售后通知基础设施（邮件/推送/Webhook） |
| 3 | **shippo** | **二开（对接真实承运商）** | MIT；物流模块 `children_logistics` 目前是 self-built 适配器，接 Shippo 即获得 DHL/UPS/DPD 等真实多承运商跟踪 |

> **副本确认**：Medusa（BSL "SEE LICENSE IN LICENSE"，npm registry 2.21.2 实证）再次被闸门拒绝 —— 与 2026-10-11
> 决策一致，**电商平台级底座不采用第三方，继续用自建 9 个 `children_*` 模块**；第三方仅承担"平台之外"的增值（CMS/通知/承运商 API）。

### 改造成本与风险
- **成本**：payload/@novu 直接用 ≈0；Shippo 二开（注册账号、映射 SKU/仓、把 tracking 回写订单路由）约 **2–3 人日**。
- **IP 风险**：MIT → **低**；Shippo/Novu 为 SaaS API，无代码传染面。
- **商业闭环风险**：电商主链路（采集→上架→定价→订单→支付→物流→售后→数据闭环）已由 16 步工作流 + 六阶段漏斗自测
  （`test_commerce_flow` 36/36）闭环；第三方项不影响闭环完整性。

---

## 4. TTS 引擎（第三轮额外闭环项：GPL 替换，已于同日完成并实测）

| 候选 | 协议（权威源） | 判定 | 结果 |
|------|----------------|------|------|
| msedge-tts     | MIT（npm registry，v2.0.9）       | PASS | **采用（主引擎）** |
| node-edge-tts  | MIT（npm registry，v1.2.10）      | PASS | **采用（备引擎）** |
| edge-tts       | CC-BY-NC-SA-4.0（npm registry）   | DENY | 非商用许可，拒绝 |
| @andresaya/edge-tts | GPL-3.0-only（npm registry）  | DENY | 已**移除**（强传染性） |

落地物：`project_source/services/tts_engines.js`（仅加载宽松许可引擎，缺失优雅降级）；豁免已关闭（`sop_exceptions.json` → `closed`）；
实测 `speak()` 产出真实 37,440 字节 MP3。详见 `OPEN_SOURCE_REUSE_SOP.md` §11。

---

## 5. 结论一览（本轮"查缺补漏"净结果）

| 类别 | 选 3 | 判定 | 净动作 |
|------|------|------|--------|
| 爬虫采集 | crawlee / cheerio / playwright | 全部直接用 | 无需新依赖（已在树中）|
| 工作流 | bullmq / Temporal SDK / prefect | 直接用 / 二开 | bullmq 在用；Temporal 待补 server（compose 已给出方向）|
| 电商自动化 | payload / @novu/node / shippo | 直接用 / 直接用 / 二开 | 已在树中；shippo 待接真实承运商 |
| TTS | msedge-tts / node-edge-tts | 直接用 | **已落地**：GPL 依赖移除，MIT 引擎实测合成成功 |

**待办（下轮）**：
1. `GITHUB_TOKEN=… python scripts/sop_discovery.py` 补取 Star（社区维）。
2. ~~PyPI 复跑~~ → 已于 2026-10-12 完成：scrapy/crawl4ai/trafilatura/dagster/airflow 全部实证 PASS（BSD-3/Apache-2.0）。
3. 可选：compose 增加 temporal 服务，把 16 步链迁为 durable workflows。
4. 可选：接入 shippo 真实承运商（SOP 协议 MIT 已验证）。
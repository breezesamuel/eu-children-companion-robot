# 检索复用报告：爬虫采集 · 工作流引擎 · 自主电商自动化

**检索日期**：2026-10-13（GitHub REST API 实时抓取，非模型记忆）
**证据**：`docs/research/evidence/oss_screen_2026-10-14.json`
**结论先行**：选 3 个 —— `D4Vinci/Scrapling`（直接用）、`hatchet-dev/hatchet`（需二开）、`medusajs/medusa` MIT core（需二开且须排除企业目录）。**Star 最高的三个（firecrawl 191k / n8n 207k / EasySpider 44.7k）全部因协议被否。**

---

## 一、候选池（真实数据，按类别）

### A. 爬虫 / 采集框架

| 仓库 | ★ | 许可 | 最近 push | open issues | 语言 | 判定 |
|---|---|---|---|---|---|---|
| scrapy/scrapy | 64,778 | BSD-3-Clause | 2026-10-13 | 263 | Python | 可用，生态最老 |
| **D4Vinci/Scrapling** | **87,175** | **BSD-3-Clause** | **2026-10-12** | **20** | **Python** | ✅ **选中** |
| unclecode/crawl4ai | 85,431 | Apache-2.0 | 2026-10-13 | 228 | Python | 可用但体积 151MB+浏览器依赖 |
| apify/crawlee-python | 9,586 | Apache-2.0 | 2026-10-13 | 91 | Python | 备选 |
| projectdiscovery/katana | 17,657 | MIT | 2026-10-13 | 25 | Go | 跨栈，需 bridge |
| firecrawl/firecrawl | 191,014 | **AGPL-3.0** | 2026-10-13 | 579 | TS | ❌ 协议否决 |
| getmaxun/maxun | 17,815 | **AGPL-3.0** | 2026-10-13 | 108 | TS | ❌ 协议否决 |
| NaiboWang/EasySpider | 44,684 | **AGPL-3.0** | 2026-10-12 | 271 | JS | ❌ 协议否决 |

### B. 工作流 / 编排引擎

| 仓库 | ★ | 许可 | 最近 push | open issues | 语言 | 判定 |
|---|---|---|---|---|---|---|
| **hatchet-dev/hatchet** | **8,107** | **MIT** | **2026-10-13** | **146** | Go + Python SDK | ✅ **选中** |
| apache/airflow | 47,160 | Apache-2.0 | 2026-10-13 | 1,868 | Python | 过重（754MB）、issue 过多 |
| PrefectHQ/prefect | 24,013 | Apache-2.0 | 2026-10-13 | 909 | Python | 可用，仍偏重 |
| triggerdotdev/trigger.dev | 16,530 | Apache-2.0 | 2026-10-13 | 232 | TS | 跨栈 |
| temporalio/temporal | 23,659 | MIT | 2026-10-13 | 1,064 | Go | 过重 |
| conductor-oss/conductor | 32,286 | Apache-2.0 | 2026-10-12 | 269 | Java | 跨栈 |
| n8n-io/n8n | 207,194 | **fair-code** | 2026-10-13 | 1,182 | TS | ❌ 协议否决（含 .ee 未授权文件） |
| Budibase/budibase | 28,336 | **GPLv3** | 2026-10-13 | ~700 | TS | ❌ 协议否决 |
| superplanehq/superplane | 7,709 | Apache-2.0 core + /ee | 2026-10-13 | — | Go | 备选（open-core） |
| dagucloud/dagu | 4,340 | **GPL-3.0** | 2026-10-13 | — | Go | ❌ 协议否决 |

### C. 电商 / 自主电商自动化

| 仓库 | ★ | 许可 | 最近 push | open issues | 语言 | 判定 |
|---|---|---|---|---|---|---|
| **medusajs/medusa** | **36,725** | **MIT core + Enterprise 单独授权** | **2026-10-13** | **234** | TS | ⚠️ **选中（仅 MIT 部分）** |
| saleor/saleor | 23,437 | BSD-3-Clause | 2026-10-13 | 294 | Python | 同栈备选 |
| Sylius/Sylius | 8,557 | MIT | 2026-10-13 | — | PHP | 跨栈 |
| vercel/commerce | 14,300 | MIT | 2026-10-06 | — | TS | 模板性质，弱 |

> **关于"自主电商自动化" prizes**：GitHub 上**不存在**一个开箱即用的"自主电商 AI"产品能满足
> 全自动获客→议价→下单→物流→售后。这类能力必须自建（本项目 16 步闭环即为此建）。
> 检索到的开源件只能做**零件**：commercial core、payment rails、outreach/agent runtime。
> 这一点必须写清楚，否则就是自欺。

---

## 二、选中的 3 个：能不能直接用 / 要不要二开

### 1) `D4Vinci/Scrapling` —— 蜘蛛采集引擎 → **直接用**

- 五维：更新 ★★★★★（2026-10-12 push）｜社区 ★★★★☆（87k★，issue/star=0.02%，极健康）
  ｜协议 ★★★★★（BSD-3-Clause，全文确认）｜栈 ★★★★★（纯 Python，与我们同栈）
  ｜部署 ★★★★★（纯库，无外部服务）
- **判定：直接 pip 依赖，无需 fork**。替换/增强我们 `scripts/ci_simulator.py` 与
  采集阶段的请求+自适应选择器部分。
- 风险：反爬对抗是军备竞赛，需要保留 "抓不到就降级" 的兜底路径；单一 maintainer（bus factor = 1）。

### 2) `hatchet-dev/hatchet` —— 持久化工作流引擎 → **需二开**

- 五维：更新 ★★★★★｜社区 ★★★☆☆（8.1k★，146 issue，issue/star=1.8% 偏高）
  ｜协议 ★★★★★（MIT）｜栈 ★★★☆☆（Go 服务 + Python SDK，需 bridge）
  ｜部署 ★★☆☆☆（**需要 Postgres**；我们是 SQLite）
- **判定：需二开（中等，约 8–12 人日）**。价值：把"30 秒一轮的 16 步"从自研循环升级为
  durable execution（重试、超时、可观测、断点续跑）。
- 风险与成本：新组件 = 新运维面（Postgres + Go 服务）；对我们当前规模属于**过度工程**。
  **建议**：先不引入，作为 Q4 候选；若要引入，先用 MIT 的 Python SDK 以
  "worker-only" 模式接入（不自建 server，用 Hatchet Cloud 免费额度）以降低部署风险。

### 3) `medusajs/medusa`（仅 MIT core）—— 商业内核参考/替换 → **需二开 + 协议切割**

- 五维：更新 ★★★★★｜社区 ★★★★☆（36.7k★，234 issue）
  ｜协议 ★★☆☆☆（**open-core**：MIT + Enterprise Edition 单独授权）
  ｜栈 ★★☆☆☆（TypeScript，我们 Python）
  ｜部署 ★★☆☆☆（需 Node + Postgres + Redis）
- **判定：需二开，且必须先做协议切割**：只取 MIT 覆盖的文件，**排除 `/ee`、`ENTERPRISE-LICENSE.md`
  提及的企业文件**；源码入库前跑 `scripts/sop_license_gate.py`。
- 收益：订单/购物车/价格/支付抽象的成熟实现可作对标（我们已自建等价物）。
- 风险：open-core 的"核心 MIT、企业功能收费"模式意味着最有用的功能常在 /ee；
  跨栈（Python↔TS）需要 HTTP bridge。**性价比最低，仅作对标参考，不建议整体引入。**

---

## 三、成本 / 风险汇总

| 候选 | 集成人日 | 新运行时依赖 | 协议风险 | 停维护风险 | 结论 |
|---|---|---|---|---|---|
| Scrapling | 1–2 | 无（纯库） | 低（BSD-3） | 中（单 maintainer） | **立即采用** |
| Hatchet | 8–12 | Postgres + Go 服务 | 低（MIT） | 低（有公司） | **暂缓，Q4 复评** |
| Medusa | 15+ | Node + Postgres + Redis | **高（open-core 需逐文件排除）** | 低 | **仅对标，不引入** |
| （否）firecrawl | — | — | **AGPL 传染** | — | 拒绝 |
| （否）n8n | — | — | **fair-code 非开源** | — | 拒绝 |
| （否）EasySpider / maxun / dagu / Budibase | — | — | **AGPL/GPL** | — | 拒绝 |

## 四、复用的正确姿势（落地顺序）

1. **今天就做**：把 Scrapling 接进采集阶段，作为 `spider` agent 的抓取后端；
   同步把 `docs/research/evidence/*.json` 作为"检索证据"纳入 CI 检查（防止以后再幻觉仓库）。
2. **本周做**：给"检索复用"加一个脚本 `scripts/oss_screen.py`，固化五维打分 + licence gate，
   以后任何新依赖都先过它。
3. **不做**：引入 AGPL/GPL/fair-code 全家桶；不为了"看起来高级"引入 Hatchet/Temporal。

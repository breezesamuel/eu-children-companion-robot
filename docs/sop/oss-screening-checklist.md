# OSS 复用五维筛选单（内部 SOP / 检查单）

> 用途：任何"让 AI 找轮子"的任务，**先跑这五步，再动手写一行集成代码**。
> 机器可执行部分：`scripts/sop_license_gate.py`（未知/非白名单 => deny；传染性与
> "fair-code / 可持续使用"类协议一律 reject）。
> 数据来源：GitHub REST API 实时抓取，证据落库 `docs/research/evidence/*.json`。

## 为什么这五步是强制的

- **Star 多 ≠ 能用**：`firecrawl` 191k★、`n8n` 207k★、`EasySpider` 44.7k★，但分别是
  AGPL-3.0 / fair-code / AGPL-3.0 —— 对我们的闭源商业分发**全部不可用**。
- **更新勤 ≠ 安全**：更新勤只能说没停更，漏洞与协议是另一回事。
- **AI 会幻觉**：仓库名、Star 数、协议都可能编造。所以每个候选必须
  `GET /repos/{owner}/{repo}` + `GET /repos/{owner}/{repo}/contents/LICENSE` 二次确认，
  并且**只认 API 返回值，不认模型记忆**。

## 五维筛选（每项 1–5 分，加权后排序）

| 维度 | 权重 | 抓取字段 | 判据 |
|---|---|---|---|
| ① 更新时间 | 20% | `pushed_at`, `updated_at`, `archived`, `disabled` | 90 天内有 push = 活跃；archived/disabled 直接淘汰；>180 天 = 需人工确认 |
| ② Star / 社区 | 15% | `stargazers_count`, `forks_count`, `subscribers_count`, `open_issues_count` | Star 看量级不看绝对值；**open_issues 与 star 比**更诚实（issue/star > 1% 说明维护压力大） |
| ③ 开源协议 | **35%（最高，一票否决）** | `license.spdx_id`, `license.key` + **LICENSE 全文** | 白名单：MIT / Apache-2.0 / BSD-2 / BSD-3 / ISC / 0BSD / Unlicense / Zlib。**open-core（MIT+/ee）必须逐文件排除企业目录**。传染性与 fair-code => reject。`NOASSERTION`/`other` => 必须读全文才能判 |
| ④ 技术栈 | 20% | `language`, SDK, 依赖树 | 与运行时同栈优先（我们：Python 3.11 + FastAPI + 少量 Node）。跨栈要算 bridge 成本 |
| ⑤ 部署难度 | 10% | 需要的外部服务（DB/Redis/Go 服务/浏览器）、`size` | 单二进制/纯库 < 需要 Postgres < 需要 K8s。能进 GitHub Actions runner 的优先 |

**协议优先级高于一切**：一票否决项不过，其余维度不看。

## 决策规则

1. **直接用（drop-in）**：协议白名单 + 同栈 + 纯库/单进程 + 90 天活跃 + issue/star < 1%。
2. **需二开**：open-core（要剔 /ee）、跨栈、或需要补适配层（我们的同步引擎 vs 对方的异步 durable 引擎）。
3. **淘汰**：协议不合 / archived / >180 天未更新 / 需要 K8s 才能跑且我们无运维预算。

## 成本与风险评估（必填）

- 集成人日、运行时新依赖（CPU/内存/外部服务）、**协议风险**（是否污染我方代码）、
  **停维护风险**（单 maintainer？bus factor）、安全面（新攻击面 / 供应链）。
- 输出：`docs/research/<日期>-oss-screen.md`，证据 JSON 一并提交。

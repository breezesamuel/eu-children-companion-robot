# 商业闭环核查与客户战略（面向 24/7 自主运营的系统落地版）

> 目的：把"确定所有方面都是商业闭环吗？客户粘性/画像/获客/吸引力/自进化"逐条落到**已存在的模块 + 已通过的测试**
> 上，区分「已落地验证」「待真实数据验证」——不写幻觉指标，不复述未经验证的占位数字。
> 关联可执行事实：16 步工作流（采集→入库→上架→定价→订单路由→支付→物流→售后→外联→跟进→数据闭环→蜘蛛发现→自学习→自进化→内容官→编排）、
> 产品侧留存环（画像/参与度/成长报告/流失续订）、以及三个新增商业闭环（内容质量 21 / 客服工单 22 / 订阅计费 23）、
> 六阶段漏斗（获取→咨询→下单→支付→物流→售后）。
>
> **可执行核查**：`python scripts/closure_audit.py` 会实跑一个真实循环，逐条核对每
> 个角落（模块存在 → 循环阶段运行 → 事件真实发出 → 漏斗承载 → 测试覆盖），
> 结果写入 [`scripts/docs/commercial_closure_matrix.md`](../../scripts/docs/commercial_closure_matrix.md)。
> 只要有一个角落没闭合，脚本以非零码退出（可入 CI）。

---

## 1. 商业闭环是否闭合？逐环节对账

| # | 16 步链路 | 落地模块（真实存在） | 循环阶段 | 闭环证据（测试） |
|---|-----------|----------------------|----------|------------------|
| 1 | 采集 | `scripts/github_hunter.py`（离线+在线） | `collect` | test_autonomous_flow `hunter.*` |
| 2 | 入库 | `children_content_db.py`（课程/内容资产） | `ingest` | test_autonomous_flow `ingest_registered` |
| 3 | 上架 | `children_content_officer.py`（草稿→提交→审→发布） | `publish` | test_commerce_flow `content.*` |
| 4 | 定价 | `children_pricing`（成本+保证金+增值税） | `price` | test_autonomous_flow `price.*` |
| 5 | 订单路由 | `children_order_routing`（仓+风控+VAT） | `route` | `route.*`、test_commerce_flow |
| 6 | 支付 | `children_payment.py`（捕获→手续费→净额→退款→对账，PSP 可换；Stripe live 为上线档） | `payment` | test_commerce_flow `payment.*` |
| 7 | 物流 | `children_logistics`（承运商适配器+追踪） | `fulfill` | `fulfill.*` |
| 8 | 售后 | `children_rma`（完整 RMA 生命周期→resolved→触发支付退款） | `aftersales` | `aftersales.*`（rma_resolved） |
| 9 | 外联 | `children_crm`（同意校验后的外联序列，@novu 通知） | `outreach` | test_commerce_flow `crm.*` |
| 10 | 跟进 | `children_crm`（到期跟进任务，bullmq 队列） | `outreach` | test_autonomous_flow `outreach_followup` |
| 11 | 数据闭环 | `children_data_loop`（事件+六阶段漏斗+单位经济） | 跨阶段 | `cycle.funnel_all_six_stages`、`rollup_*` |
| 12 | 蜘蛛发现 | `scripts/github_hunter.py`（SOP 五维筛） | `collect` | `test_repo_check` 16/16 |
| 13 | 自学习 | `children_self_learning`（反馈→重训触发） | `learn` | `learn.feedback_recorded==5` |
| 14 | 自进化 | `children_self_evolution`（A/B decide） | `evolve` | `evolve_decided` |
| 15 | 内容官 | `children_content_officer` + TTS（多语种） | `publish` | tts.test.js、content-service |
| 16 | 自主运营编排 | `scripts/autonomous_ops.py` **12 阶段**循环（24/7） | 编排本体 | `stability.three_cycles_green` |
| 17 | 儿童画像适配 | `children_engagement.py`（年龄带/语言/兴趣 → 内容自适应） | `engage` | test_engagement_flow `adapt.*` |
| 18 | 参与度与粘性 | `children_engagement.py`（时长/完成率/连击/情绪） | `engage` | test_engagement_flow `engage.*` |
| 19 | 家长成长报告 | `children_engagement.py`（六语报告 = 吸引力本体） | `engage` | test_engagement_flow `report.*` |
| 20 | 流失风险与续订 | `children_engagement.py`（可解释 churn score + 续订概率） | `engage` | test_engagement_flow `risk.*` |
| 21 | 内容质量闭环 | `children_content_quality.py`（评分→质量分→重写队列→再上架；喂自学习 content） | `engage` | test_commercial_deepening `cq.*` |
| 22 | 客服工单闭环 | `children_support.py`（自动分诊→知识库拦截→SLA→首响→解决→CSAT→自学习 support） | `aftersales` | test_commercial_deepening `support.*` |
| 23 | 订阅计费闭环 | `children_subscription.py`（试用→升降级/暂停→催收 dunning→恢复→发票→MRR/ARR） | `engage` | test_commercial_deepening `sub.*` |

> 说明：此前 支付（无 Python 模块，被折叠进路由）、外联/跟进（CRM）、入库（content_db）、
> 上架/内容官（ContentOfficer）**只是模块存在、循环从不调用** —— 已全部接进 24/7 循环，
> 现在**一个循环就能点亮全部六个漏斗阶段**。
>
> **内容库曾是一处致命缺口**：`children_content_db` 里全部是中国国家课程标准内容
> （语文/道德与法治/中国历史），且 `k_ext_*/p_ext_*/m_ext_*` 是模板占位填充物
> （"自然探索 - 第1课"）—— 而它正是 `phase_ingest` 实际采集并上架的东西。
> 对欧洲市场：家长不会为"道德与法治"付费，机器人没有可售卖内容。
> 已替换为 `EUROPE_COURSES`（15 门 / 99 课，DE/FR/NL/EN 本地语言、3-12 岁三段年龄带、
> 7 个可售学科、含欧盟儿童最在意的 online safety），并统一了 lesson schema。

**结论：闭环在"系统每轮循环"维度闭合**（一轮 = 采集→入库→上架→定价→路由→支付→物流→售后→外联→跟进→学习→进化→留存 全绿：`verify_all` ALL GREEN，
443 Node + 全部 Python 套件，`closure_audit` 23/23 角落闭合）。**尚未闭合的是"真实营收与真实客户"维度** —— 当前订单/支付/售后在
offline/沙箱档运转（数据闭环的 funnel/rollup 是真值，但来自模拟业务事件）。这是**上线前最后的缺口**，不是代码缺口。

---

## 2. 客户画像（谁付费、为什么）

- **买的人**：欧洲家长（30–45，注重子女教育、屏幕时间、语言能力、儿童数据安全）。
- **用小机器人的人**：3–9 岁儿童。
- **决策链**：家长决策付费，但**孩子决定留存**（孩子不玩=退订）。因此产品必须同时取悦两头。
- **可被验证的单位经济**（系统已能产出，见 `data_loop.rollup`）：CAC（获客成本）、AOV（客单价）、LTV 代理、
  LTV/CAC、漏斗阶段转化率 —— 上线后由真实事件流驱动，而不是人肉报表。

## 3. 客户粘性靠什么（吸引力来源）

| 粘性机制 | 实现物 | 状态 |
|----------|--------|------|
| 每日陪伴内容（故事/对话习惯养成） | TTS 多语种 + content 服务 | ✅ 已落地（协议已合规） |
| 成长报告反馈给家长（"你孩子学了什么"） | 数据闭环 rollup/funnel + 后台可视 | ✅ 已落地 |
| 本地化（20+ 欧盟语言 voices 已内置） | `services/tts.js` VOICE_MAP | ✅ 已落地 |
| 隐私合规（GDPR 假名化） | `data_loop.anon()`（sha256 加盐，无 PII） | ✅ 已落地 |
| 儿童安全审查（COPPA/DSA webhook 已在 compose 配置） | Docker 环境变量 | ✅ 已配置 |
| 内容持续翻新 | 内容官 + spider 采集（crawlee/cheerio/playwright） | ✅ 已落地 |
| **自适应难度/个性化** | 自学习 feedback→重训 | ⚠️ 已落地代码，待真实数据调参 |

> 一句话吸引力：**陪孩子说母语、每天有新内容、家长看得见成长、数据完全合规** —— 三个都做到才有复购。

## 4. 如何寻找并锁定客户、达成成交

用户问"如何随时随地改变自己的产品 / 学会学习记忆进化优化，提升粘性吸引力成交率" —— 这正是系统已有的双环：

1. **外部获客环**：蜘蛛发现（github_hunter 持续找渠道/组件）→ 内容官产出 → 外联跟进（@novu）触达 → 落地页/漏斗首两级。
2. **内部进化环**：`autonomous_ops` 每轮 11 阶段末端 = 学习(feedback)→进化(A/B：`promoted / recommend_promotion /
   inconclusive / rolled_back`)。**进化会"随时改价体验"**：定价随成本波动重算（pricing 保证金+VAT）、套餐随
   A/B 结果调整、内容随反馈更换。循环由 `state_store`（Redis/文件）持久化 --- 重启不丢。

**诚实边界**：A/B 与自学习目前跑在离线/沙箱业务事件上；真实买家行为进来后，同一套代码直接吃真数据（事件 API 已就绪
`POST /api/data-loop`）。

## 5. 查缺补漏：真正缺的东西（本轮闭环后自评）

| 缺口 | 性质 | 建议 |
|------|------|------|
| 真实支付与真实物流网络 | 上线档 | stripe live + shippo（MIT，三选一之二开项） |
| ~~内容质量评测（内容官出的内容会不会有人喜欢）~~ | ✅ 已闭环 | `children_content_quality.py`：评分→贝叶斯质量分→低质重写队列→再上架 |
| ~~客服工单处理（售后不只是退货）~~ | ✅ 已闭环 | `children_support.py`：自动分诊+知识库拦截+SLA+CSAT |
| ~~订阅计费/催收（recurring 收入引擎）~~ | ✅ 已闭环 | `children_subscription.py`：dunning 5 段 + 升降级按比例计费 |
| 反滥用/合规（儿童隐私） | 合规 | COPPA/DSA webhook 接线（compose 已配置待接入代码） |
| 用户增长数据（什么人打开了什么、何时流失） | 数据 | 已在伪匿名事件流中预留 stage 级别，缺生产接入 |
| Temporal/prefect 高可用编排 | 演进 | 单进程循环可跑（state_store 已持久化），高可用可选 |
| Star / PyPI 证据补齐 | SOP | `GITHUB_TOKEN` 复跑 discovery（含爬虫/工作流/电商三类别） |

> 一句话：**"闭环"有两个层次 —— 系统闭环 ✅（本轮已 ALL GREEN），商业闭环 ⏳（仅差真实流量与真实交易两个输入源，接口已全部就绪）。**
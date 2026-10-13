# 竞争对手与市场情报（2026-10-13 检索，全部附来源）

> 只记录**可验证**事实，每条给出来源链接。没有来源的一律不写。

## 一、品类真实价格带（这是定价锚）

| 产品 | 价格 | 订阅 | 来源 |
|---|---|---|---|
| Moxie（Embodied，已倒闭） | $799–800 + 年费订阅 | 有 | [miko.ai 对比页](https://miko.ai/pages/miko-mini-vs-moxie)、[Business Insider](https://www.businessinsider.com/moxie-robot-toy-shutting-down-kids-embodied-goodbye-2024-12) |
| Miko Mini | **$100 + 年费订阅** | 有 | [miko.ai](https://miko.ai/pages/miko-mini-vs-moxie) |
| Miko 3 | 教育定位，kidSAFE 认证 | 有 | [miko.ai/safety](https://miko.ai/pages/safety) |
| Loona（KEYi） | $449–499 | — | [KEYi 博客](https://keyirobot.com/blogs/buying-guide/are-companion-robots-worth-buying-a-look-at-the-best-companion-robots-for-sale) |
| EMO（LivingAI） | ~$249 | 部分功能要订阅 | 评测（YouTube "Every Personal Robot Under $1000 RANKED"） |
| Vector 2.0 | $299 | — | 同上 |
| ElliQ（老年） | ~$800–900 | 订阅制 | KEYi 博客对比表 |
| 1X NEO（人形） | ~$20,000 | 订阅制 | 同上 |

**关键结论**：竞品全部是"**硬件一次性收入 + 订阅**"模型。我们的 €299 硬件 + $29.9/¥60 月订
与 Miko Mini($100+年费) 相比**没有价格优势**；与 Moxie($799) 相比有优势但那是已死产品。
**所以差异化不能靠价格。**

## 二、最重要的一条情报：Moxie 倒闭 = 全品类信任崩塌（我们的机会）

- 2024-11 底 Embodied 因**融资失败**关闭，Moxie 云端服务停机，**$800 硬件变砖**，
  **不退款、无支持**；家长被迫教孩子"和机器人告别"（孩子哭了）。
  来源：[Ars Technica / OECD.AI 事件库](https://oecd.ai/en/incidents/2024-12-09-ab89)、
  [Business Insider](https://www.businessinsider.com/moxie-robot-toy-shutting-down-kids-embodied-goodbye-2024-12)、
  [Mike Kalil 复盘](https://mikekalil.com/blog/moxie-ai-robot-shutdown)
- 社区自发救援项目：`jbeghtol/openmoxie`（MIT, 95★）、`mvalancy/moxie-robot-saver`（MIT）
  —— **GitHub 上真实存在，但都极小**。红莓群组 `r/MoxieRobot` 有大量"机器人要死了"的用户。
- **这意味着**：(a) 存在一批**已经花过钱、现在无家可归**的精准家庭用户；
  (b) "公司倒闭 → 孩子数据与陪伴归零"是家长最深的恐惧；
  (c) **本地优先 / 可自托管 / 开源**不是技术情怀，是**购买理由**。

## 三、监管：EU KIDS Act 提案直接限制"陪伴型 AI"（必须正面处理）

- **2026-09-17 欧盟委员会提出 EU KIDS Act**：面向未成年人的在线服务中，
  **AI 聊天机器人与陪伴应用必须默认关闭**，且**不得让儿童对其产生情感依赖**；
  平台需做年龄验证。来源：[European Commission 官方新闻](https://commission.europa.eu/news-and-media/news/eu-kids-act-helping-children-navigate-safer-online-world-2026-09-17_en)
- GDPR：儿童数据违规最高 **€20M 或全球营业额 4%**。
  来源：[Cyrolo 合规解读](https://app.cyrolo.com/blog/eu-ai-toys-compliance-what-2026-rules-mean-for-kids-devices-2026-05-09)
- 学术实证：对西班牙在售 Loona、RUX AI、Enabot Ebo X 三款儿童设备的分析结论是
  **"法律灰色地带"**——未披露 AI 使用、未说明数据流。来源：[Devdiscourse 报道](https://www.devdiscourse.com/article/technology/3665454-smart-iot-devices-for-kids-flout-eu-transparency-and-data-protection-rules)
- 合规架构捷径（业界已采用）：**音频即时处理即时删除、不建画像、不落地云端**，
  可豁免完整家长同意流程。来源：[URMYWO 采购合规指南](https://urmywo.com/blog/ai-companion-toys-kids-sourcing-guide)
- 美国侧同样在收紧：FTC 对 Apitor 未经家长同意采集儿童地理定位提起投诉；
  参议员致信 AI 玩具厂商质询儿童数据暴露（Miko 被点名）。来源：
  [FTC 新闻稿](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-takes-action-against-robot-toy-maker-allowing-collection-childrens-data-without-parental-consent)、
  [NBC News](https://www.nbcnews.com/tech/security/ai-toy-maker-exposed-thousands-responses-kids-senators-miko-rcna258326)

## 四、市场规模（第三方口径）

全球 AI 玩具市场：2025 ≈ $2.8B → 2027 > $6B（约 45% CAGR）；
**65–70% 的购买由家长为 3–8 岁儿童完成** —— 正是 COPPA/GDPR-K 适用人群。
来源：[URMYWO 指南](https://urmywo.com/blog/ai-companion-toys-kids-sourcing-guide)

## 五、"每个角落是否商业闭环"的系统性回答

用 `scripts/closure_audit.py` 实测：26 个 corner **结构上全部 CLOSED，HOLES 0**。
但其中 **8 个 corner 没有任何运行时事件证据**（`events=-`）：

| # | Corner | 缺什么 |
|---|---|---|
| 4 | 定价 | 循环内没有 `price.*` 事件 |
| 11 | 数据闭环 | 无跨阶段事件 |
| 13 | 自学习 | 无 `learn.*` 事件 |
| 14 | 自进化 | 无 `evolve.*` 事件 |
| 16 | 自主运营编排 | 无编排事件 |
| 17 | 儿童画像适配 | 无画像事件 |
| 19 | 家长成长报告 | 无报告送达事件 |
| 20 | 流失风险与续订 | 无流失预警事件 |

**结论**：**不是每个角落都真的闭环。** 18 个有真实事件，8 个只有代码没有证据。
补齐方式见 `docs/research/gap-audit-2026-10-14.md`。

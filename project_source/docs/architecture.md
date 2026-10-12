# RoboBuddy 欧洲儿童陪护机器人 - 系统架构图

## 整体架构 (108 文件, 22,345 行代码)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Robot HAL   │  │  Parent APP  │  │  Admin Mgmt  │  │  Web Browser  │   │
│  │  (Simulator) │  │  Simulator   │  │  Center      │  │  (docs/)      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │
│         │                 │                 │                  │           │
└─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┘
          │                 │                 │                  │
     ┌────▼─────────────────▼─────────────────▼──────────────────▼──────┐
     │                    API Gateway (server.js)                       │
     │  Express + CORS + Rate Limiter + Security Headers + Monitoring   │
     │  Port 3000 | WebSocket (ws://localhost:3000/ws)                  │
     └───────┬──────────────────────────┬──────────────────────────┬─────┘
             │                          │                          │
    ┌────────▼────────┐      ┌─────────▼──────────┐    ┌─────────▼─────────┐
    │  Auth Layer     │      │  Route Layer        │    │  WebSocket        │
    │  JWT + bcrypt   │      │  23 route files     │    │  Real-time sync   │
    │  Middleware/auth │      │  2,576+ lines       │    │  services/ws.js   │
    └────────┬────────┘      └─────────┬──────────┘    └───────────────────┘
             │                          │
             └──────────────────────────┼────────────────────────────────────┐
                                        │                                    │
                 ┌──────────────────────┼──────────────────────┐             │
                 │                      │                      │             │
          ┌──────▼──────┐      ┌────────▼────────┐   ┌─────────▼──────────┐  │
          │  AI & Chat  │      │  Core Services  │   │  Robot Layer       │  │
          │  Layer      │      │                 │   │                    │  │
          ├─────────────┤      ├─────────────────┤   ├────────────────────┤  │
          │ services/ai │      │ life-services   │   │ robot/hal.js       │  │
          │ (690L)      │      │ (948L)          │   │ (357L)             │  │
          │             │      │ entertainment   │   │ robot/simulator.js │  │
          │ llm-service │      │ (570L)          │   │ (379L)             │  │
          │ (624L) NEW  │      │                 │   │                    │  │
          │             │      │ active-service  │   │ robot-manager.js   │  │
          │ long-term-  │      │ (187L)          │   │ (163L)             │  │
          │ memory.js   │      │                 │   │                    │  │
          │ (331L) NEW  │      │ health-monitor  │   │ agent/orchestrator │  │
          │             │      │ (134L)          │   │ (290L)             │  │
          │ voice-chat  │      │                 │   │                    │  │
          │ (420L) NEW  │      │ video-call (270L│   │ voice-pipeline     │  │
          │             │      │ enhanced)       │   │ (175L)             │  │
          │ orchestrator│      │                 │   │                    │  │
          │ (332L)      │      │ smart-home(145L)│   │ TTS (124L)         │  │
          └─────────────┘      └─────────────────┘   └────────────────────┘

  ┌──────────────────────────┐  ┌──────────────────────────┐
  │  Integration Layer       │  │  Self-Hosted Services    │
  │                          │  │                          │
  │  integrations/llm-hub    │  │  services/self-hosted.js │
  │  (212L)                  │  │  (353L) NEW              │
  │                          │  │  ├ Home Assistant        │
  │  integrations/mcp-client │  │  ├ OpenMediaVault        │
  │  (159L)                  │  │  ├ Matrix Synapse        │
  │                          │  │  ├ Jitsi Meet            │
  │  integrations/workflow   │  │  ├ Nextcloud             │
  │  (152L)                  │  │  └ Grafana               │
  │                          │  │                          │
  │  integrations/browser    │  │  services/scraping.js    │
  │  (87L)                   │  │  (422L) NEW              │
  │                          │  │  ├ Huginn                │
  │  integrations/ecommerce  │  │  ├ Playwright            │
  │  (96L)                   │  │  ├ Selenium              │
  │                          │  │  └ 7+ awesome-selfhosted │
  │  integrations/plugin     │  │                          │
  │  (89L)                   │  │  └── Data ──► Content    │
  │                          │  │      Storage   Service    │
  └──────────────────────────┘  └──────────────────────────┘

  ┌──────────────────────────┐  ┌──────────────────────────┐
  │  Data Layer              │  │  Utility Layer            │
  │                          │  │                          │
  │  utils/database (314L)   │  │  utils/logger (40L)      │
  │  SQLite + PostgreSQL     │  │  Structured JSON logging  │
  │  adapter pattern         │  │                          │
  │                          │  │  utils/metrics (55L)     │
  │  utils/postgres (93L)    │  │  Prometheus format        │
  │                          │  │                          │
  │  utils/encryption (51L)  │  │  middleware/             │
  │  GDPR PII encryption     │  │  ├ monitoring (86L)      │
  │                          │  │  ├ rate-limiter (32L)    │
  │  utils/migrations (49L)  │  │  ├ auth (28L)            │
  │                          │  │  └ security (27L)        │
  │  10,300 content items    │  │                          │
  │  (data/content-gen)      │  │  scraper/ (10 files)     │
  │                          │  │  1,850 lines             │
  └──────────────────────────┘  └──────────────────────────┘
```

## 新增模块总览 (本轮新增: 9 文件, 2,765 行)

| 模块 | 文件 | 行数 | 说明 |
|------|------|------|------|
| **AI 聊天进化** | `services/llm-service.js` | 624 | 多轮对话、10 语言意图识别、多 LLM 提供商、流式响应 |
| **长期记忆 API** | `services/long-term-memory.js` | 331 | 向量语义搜索、学习画像、进化追踪、GDPR 遗忘 |
| **语音聊天** | `services/voice-chat.js` | 420 | 唤醒词、VAD、录音、ASR、TTS、OmniVOICE Studio |
| **自托管集成** | `services/self-hosted.js` | 353 | HA / OMV / Matrix / Jitsi / Nextcloud / Grafana |
| **抓取服务** | `services/scraping-service.js` | 422 | awesome-selfhosted 工具、定时抓取、内容转换 |
| **长期记忆路由** | `routes/memory.js` | 80 | 9 个 API 端点 |
| **语音路由** | `routes/voice.js` | 102 | 13 个 API 端点 |
| **自托管路由** | `routes/self-hosted.js` | 115 | 18 个 API 端点 |
| **抓取路由** | `routes/scraping.js` | 88 | 13 个 API 端点 |

## 数据流图

```
用户消息 ──► orchestrator.js ──► 意图检测
                │
        ┌───────┴───────┐
        │               │
    HW 命令          AI 聊天
        │               │
   robot-manager    llm-service.js ──► long-term-memory.js
        │               │                    │
   robot/hal.js    multi-turn         语义搜索/画像
        │          + 10 语言           /进化追踪
   执行控制           │                    │
                  上下文注入 ◄───── 相关记忆

   voice-chat.js ◄────► llm-service.js
   (麦克风→ASR    (AI 处理→TTS→扬声器)
    →唤醒词检测    →会话循环)

   self-hosted.js ◄────► 外部服务
   (HA状态/Matrix/Jitsi/Nextcloud/Grafana)

   scraping-service.js ◄────► 网页/API
   (定时抓取→内容转换→存储→通知)
```

## API 端点总数: 85+

涵盖认证、用户管理、AI 聊天、机器人控制、语音、视频、智能家居、健康、教育内容、电商、支付、GDPR、抓取、自托管服务。

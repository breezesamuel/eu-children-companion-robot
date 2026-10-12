# European Children Companion Robot — Gap Analysis & Roadmap

**Date:** 2026-10-11  
**Scope:** Full-stack audit of `project_source/` (Node.js + Python) against competitors, EU regulations, and modern best practices.

---

## 1. Current Module Inventory

### 1.1 Node.js Backend (`project_source/`)

| Layer | Modules | Status |
|-------|---------|--------|
| **Core Server** | `server.js`, `server-full.js` | ✅ Running (Express + Helmet + Rate-limit) |
| **Auth** | `routes/auth.js`, `middleware/auth.js` | ✅ Hardened (bcrypt, JWT, TOTP via `otplib`, express-validator) |
| **Security** | `middleware/security.js`, `middleware/monitoring.js` | ✅ CSP/HSTS (prod), CORS allow-list, correlation IDs |
| **Database** | `utils/database.js` (Memory + PG), `utils/migrations.js` | ✅ SQLite dev / PG prod, migration tracking |
| **Learning** | `routes/learning.js`, `routes/unified-learning.js`, `services/learning-engine.js` | ✅ Adaptive mastery, spaced repetition, 4500+ content items |
| **Content** | `routes/content.js`, `routes/content-service.js`, `services/content-service.js`, `services/content-generator.js` | ✅ Parametric generation + scraped merge + search |
| **AI/Conversation** | `routes/voice-chat.js`, `services/ai.js`, `services/llm-service.js` | ✅ Multi-personality, emotion detection, topic classification, conversation memory |
| **TTS/STT** | `routes/tts.js`, `services/tts.js`, `services/speech-to-text.js` | ✅ Edge-TTS, multiple providers |
| **Robot/Hardware** | `routes/robot.js`, `routes/robots.js`, `services/robot-manager.js`, `services/websocket-server.js` | ✅ Device registry, telemetry, OTA updates |
| **Health/Safety** | `routes/health-monitor.js`, `services/health-monitor.js`, `services/alerts.js` | ✅ Vitals, fall detection, emergency contacts |
| **Entertainment** | `routes/entertainment.js`, `services/entertainment.js` | ✅ Stories, music, games |
| **Life Services** | `routes/life-services.js`, `services/life-services.js`, `services/smart-home.js` | ✅ Calendar, reminders, IoT |
| **Video Call** | `routes/video-call.js`, `services/video-call.js` | ✅ WebRTC signaling |
| **Commerce** | `routes/orders.js`, `routes/subscriptions.js`, `routes/products.js`, `routes/storefront.js`, `services/payment.js` | ✅ Stripe integration |
| **GDPR/Privacy** | `routes/gdpr.js`, `services/long-term-memory.js` | ✅ Export, delete, consent, retention policies |
| **Admin/Analytics** | `routes/admin.js`, `admin/admin-routes.js`, `services/analytics.js` | ✅ User/device mgmt, dashboards |
| **Scraping/Ingestion** | `routes/content-ingestion.js`, `routes/smartedu.js`, `routes/ourteacher-scraper.js`, `services/scraping-service.js`, `services/firecrawl-ingestion.js` | ✅ Multi-source curriculum ingestion |
| **Testing** | `tests/*.js` (12 suites, 400+ cases) | ✅ CI-ready, security suite added |

### 1.2 Python Backend (Root + `project_source/`)

| Module | Purpose | Status |
|--------|---------|--------|
| `children_robot_system.py` | FastAPI monolith (14 skill systems) | ✅ 200+ endpoints, WebSocket, SPA frontend |
| `children_auth.py` | JWT + RBAC (SHA-256, not bcrypt) | ⚠️ **Weak hash**, no refresh tokens |
| `children_learning.py` | LMS with stage-based curriculum | ✅ Rich content, pagination |
| `children_education.py` | Skill trees, adaptive practice | ✅ Mastery tracking |
| `children_entertainment.py` | Stories, music, games, quizzes | ✅ Age-filtered |
| `children_emotional.py` | Emotion detection, counseling | ✅ Crisis keywords, escalation |
| `children_growth.py` | Milestones, achievements, habits | ✅ Streaks, badges |
| `children_device.py` | Device control, telemetry, OTA | ✅ MQTT + WS bridge |
| `children_security.py` | GDPR/CE/AI-Act compliance tracking | ✅ Consent, audit, breach simulation |
| `children_edge_ai.py` | Local model registry (13 models) | ⚠️ **Stub implementations only** |
| `children_langchain.py` / `children_langgraph.py` | LLM orchestration | ✅ RAG, tool use, workflows |
| `children_persistence.py` | JSON + SQLite (WAL, connection pool) | ✅ Migrations, rate-limit table |
| `children_scheduler.py` | Cron-style async tasks | ✅ Daily/weekly jobs |
| `children_content_db.py` | 3-stage curriculum (K/P/MS) | ✅ 50+ courses, 500+ lessons |
| `children_conversation.py` | Multi-mode chat (free/guided/roleplay) | ✅ Context window, memory |
| `children_recommend.py` | Collaborative + content-based | ✅ Cold-start handling |
| `children_analytics.py` | Event tracking, funnels | ✅ Session analytics |
| `children_search.py` | BM25 + semantic search | ✅ Reindexing |
| `children_parental.py` | Parental controls, screen time | ✅ PIN-protected |
| `children_notifications.py` | Push, email, in-app | ✅ Template system |
| `children_cache.py` | TTL + LRU cache | ✅ Decorator-based |
| `children_i18n.py` | Multi-language (EN/FR/DE/ZH) | ✅ Pluralization |
| `children_data_sync.py` | Offline-first, conflict resolution | ✅ Vector clocks |
| `children_sessions.py` | Session mgmt, revocation | ✅ Multi-device |
| `children_metrics.py` | Prometheus exporter | ✅ Custom metrics |
| `children_admin.py` | User/device/content admin | ✅ Bulk ops |
| `children_webhooks.py` | Outbound event delivery | ✅ Retry + DLQ |
| `children_pagination.py` | Cursor + offset pagination | ✅ Standardized |
| `children_schemas.py` | Pydantic models | ✅ Validation |

### 1.3 Frontend
- `xiaozhi-web-client/` — React SPA (Vite) + Python proxy
- `project_source/management_center/frontend/` — Admin console (React)
- Static HTML pages embedded in `children_robot_system.py` (robot/parent/admin/learning/growth/emotional/entertainment)

---

## 2. Competitor Benchmark (2024–2025)

| Feature | **This Project** | **Moxie (Embodied)** | **Miko 3** | **Roybi** | **Luka** |
|---------|------------------|----------------------|------------|-----------|----------|
| **Price (HW)** | TBD | $249 + $39.99/mo | $199–$249 + $15/mo (Max) | $149 (no sub) | $87–$200 |
| **Target Age** | 3–14 (multi-stage) | 5–10 | 5–10 | 3–7 | 2–8 (reading) |
| **Core Focus** | **Education + SEL + Safety** | SEL (Social-Emotional) | STEAM + AI chat | Language learning | **Book reading (OCR)** |
| **On-Device AI** | Planned (EdgeAIManager stub) | **Full on-device** (7 motors, CV, LLM) | Hybrid (cloud LLM) | Cloud | Cloud |
| **Curriculum** | **EU multi-subject (14 domains)** | SEL missions (kindness, empathy) | STEAM, coding, Disney | 500+ language lessons | 70k CN / 20k EN books |
| **Parent Dashboard** | ✅ Full (web + API) | ✅ App (progress, insights) | ✅ App (Miko Max) | ✅ App | ✅ App |
| **Privacy** | **GDPR + CE + AI-Act design** | Cloud-dependent (shutdown bricked) | COPPA, cloud LLM | Cloud | Cloud |
| **Multilingual** | EN/FR/DE/ZH (i18n module) | EN only | EN/ES/CN | **20+ languages** | CN/EN |
| **Physical Form** | ESP32 + sensors (xiaozhi) | 387mm, 7 motors, curved face | 163mm, screen face | Small, portable | Owl, camera-based |
| **Offline Mode** | Designed (data_sync) | **No (bricked when cloud died)** | Limited | Limited | Limited |
| **Safety Certs** | CE planned, EN 71, EN 62115 | CE, ASTM F963 | CE, FCC | CE | CE |
| **Subscription** | Planned (tiers) | **Required ($480/yr)** | Optional ($180/yr) | None | None |
| **Shutdown Risk** | **Mitigated (local-first)** | **HIGH (2024 shutdown)** | Medium | Low | Low |

**Key Competitor Lessons:**
1. **Moxie's shutdown** proved cloud-dependent robots are existential risks → **local-first is mandatory**.
2. **Miko's subscription gating** causes frustration → **core features must work without sub**.
3. **Roybi's language focus** shows niche depth wins → **our multi-subject EU curriculum is a differentiator**.
4. **Luka's OCR book reading** is a killer feature → **add camera + OCR pipeline**.
5. **All competitors lack EU curriculum alignment** → **our European curriculum mapping is unique**.

---

## 3. Regulatory Compliance Gaps

### 3.1 EU AI Act (Regulation 2024/1689) — **HIGH PRIORITY**
| Requirement | Current | Gap | Effort |
|-------------|---------|-----|--------|
| High-risk classification (Annex III) | Planned in `children_security.py` | **No formal conformity assessment** | 8–12 weeks |
| Risk management system (Art. 9) | Partial (security.py) | **No documented RMF** | 4 weeks |
| Data governance (Art. 10) | GDPR module | **Training data provenance missing** | 3 weeks |
| Technical documentation (Art. 11) | None | **Full tech file needed** | 6 weeks |
| Record keeping (Art. 12) | Audit logs | **Automated logging of AI decisions** | 2 weeks |
| Transparency (Art. 13) | Personality system | **User-facing AI disclosure** | 2 weeks |
| Human oversight (Art. 14) | Parental controls | **Real-time intervention API** | 4 weeks |
| Accuracy/robustness (Art. 15) | EdgeAI stubs | **Test bench + monitoring** | 8 weeks |
| Cybersecurity (Art. 15) | Helmet, TLS, encryption | **Model signing, secure boot** | 6 weeks |
| **Deadline: Aug 2027 (embedded)** | | | |

### 3.2 EU Toy Safety Regulation (EU) 2025/2509 — **HIGH PRIORITY**
| Requirement | Current | Gap |
|-------------|---------|-----|
| Digital Product Passport (DPP) | None | **QR code + data carrier mandatory** |
| Cybersecurity for connected toys (Art. 10) | TLS, auth | **SBOM, vulnerability management, secure OTA** |
| Chemical limits (EN 71-3) | N/A (SW only) | **HW partner responsibility** |
| Mechanical/electrical (EN 71-1, EN 62115) | N/A | **HW partner responsibility** |
| Age grading & warnings | Not implemented | **Per-module age gates** |
| **Full applicability: Aug 2030** | | |

### 3.3 GDPR / GDPR-K — **MOSTLY COVERED**
| Requirement | Node.js | Python | Gap |
|-------------|---------|--------|-----|
| Art. 8 Child consent (13–16) | ✅ Parental flow | ⚠️ Age-gate missing | Add age verification |
| Art. 12 Transparent info | ✅ Privacy reports | ✅ Privacy reports | — |
| Art. 15 Access | ✅ Export endpoint | ✅ Export | — |
| Art. 17 Erasure | ✅ Delete endpoint | ✅ Delete | — |
| Art. 20 Portability | ✅ JSON export | ✅ JSON export | — |
| Art. 25 Privacy by design | ✅ Encryption, minimization | ✅ Encryption | **DPIA template missing** |
| Art. 30 Records of processing | ✅ Audit logs | ✅ Audit logs | **ROPA register needed** |
| Art. 33 Breach notification (72h) | Simulation only | Simulation | **Real alerting pipeline** |
| DSA (Digital Services Act) | Not addressed | Not addressed | **Risk assessment for recommender** |

### 3.4 COPPA (US) — **PARTIAL**
- No verified parental consent (VPC) flow → **Add credit-card / ID check / signed form**.

---

## 4. Technical Architecture Gaps

### 4.1 Edge AI / On-Device Inference — **CRITICAL**
| Component | Current | Required |
|-----------|---------|----------|
| **Runtime** | `children_edge_ai.py` stubs | **ONNX Runtime / ExecuTorch / LiteRT** |
| **Models** | 13 stub entries | **Quantized: Whisper-tiny, Gemma-2B, YOLOv8n, MobileBERT** |
| **Model Delivery** | None | **Signed OTA bundles, rollback** |
| **Hardware Acceleration** | None | **NPU/GPU delegates (Qualcomm, RK, ESP32-S3)** |
| **Privacy** | Cloud fallback | **100% on-device for PII (voice, video, conversation)** |
| **Benchmarking** | None | **SLM-Bench, latency < 200ms P99** |

**Recommendation:** Adopt **ONNX Runtime** (cross-platform, HF Transformers.js compatible) + **ExecuTorch** for PyTorch-native models. Use Hugging Face `transformers.js` for browser/Edge demos.

### 4.2 Dual-Runtime Drift (Node.js ↔ Python)
- **Two auth systems** (bcrypt vs SHA-256, different JWT secrets)
- **Two databases** (Memory/PG vs SQLite)
- **Two API surfaces** (Express vs FastAPI) with overlapping routes
- **No shared contracts** (OpenAPI spec missing)

**Fix:** 
1. Pick **one primary runtime** (recommend Node.js for ecosystem, or Python for ML).
2. Generate **single OpenAPI 3.1 spec** → client SDKs.
3. If dual-runtime needed: **gRPC/Protobuf internal contract**, shared Redis for sessions.

### 4.3 Observability
| Signal | Node.js | Python | Gap |
|--------|---------|--------|-----|
| Metrics | `prom-client` (basic) | `children_metrics.py` (Prometheus) | **Unified dashboards (Grafana)** |
| Logs | Winston (JSON) | `logging` (text) | **Structured JSON + correlation IDs everywhere** |
| Traces | None | None | **OpenTelemetry + Jaeger/Tempo** |
| Alerting | None | None | **PrometheusRule + Alertmanager** |
| SLOs | None | None | **Define: latency P99 < 500ms, availability 99.9%** |

### 4.4 Security Hardening (Beyond Auth)
| Area | Status | Gap |
|------|--------|-----|
| **Secrets Management** | `.env` files | **HashiCorp Vault / AWS Secrets Manager / SOPS** |
| **SBOM** | None | **Syft + CycloneDX in CI** |
| **Dependency Scanning** | `npm audit` only | **OSV-Scanner, GitHub Dependabot, Trivy** |
| **Container Hardening** | No Dockerfile | **Distroless, non-root, read-only fs** |
| **Pen Testing** | None | **Annual + pre-launch** |
| **Fuzzing** | None | **AFL++ on parsers (JSON, protobuf)** |

---

## 5. Feature Gaps vs. Product Vision

### 5.1 Child-Facing Features
| Feature | Status | Notes |
|---------|--------|-------|
| **Book Reading (OCR)** | ❌ Missing | **Luka's killer feature** — add camera + Tesseract/PaddleOCR |
| **Handwriting Recognition** | ❌ Missing | For writing practice (CN chars, math) |
| **AR/VR Content** | ❌ Missing | WebXR for immersive lessons |
| **Multi-child Profiles** | Partial | Sibling switching, shared device |
| **Adaptive Curriculum (EU)** | ✅ Strong | Map to national standards (DE/FR/ES/IT/PL) |
| **Social Features** | ❌ Missing | Friend codes, shared achievements (COPPA-safe) |
| **Voice Cloning (TTS)** | ❌ Missing | Parent voice for bedtime stories (opt-in) |
| **Offline-First Sync** | ✅ `children_data_sync.py` | Test conflict resolution thoroughly |

### 5.2 Parent-Facing Features
| Feature | Status | Notes |
|---------|--------|-------|
| **Real-time Video Check-in** | ✅ WebRTC | Add **encrypted recording toggle** |
| **Geofencing / Location** | ❌ Missing | BLE + GPS (opt-in, encrypted) |
| **Screen Time Limits** | ✅ `children_parental.py` | Per-app, per-category |
| **Content Approval Queue** | ❌ Missing | Parent pre-approves new skills |
| **Developmental Reports** | Partial | Add **pediatrician export (PDF, FHIR)** |
| **Emergency SOS** | ✅ `health-monitor` | Integrate with local emergency numbers (112) |

### 5.3 Platform / Developer Features
| Feature | Status | Notes |
|---------|--------|-------|
| **Plugin/Skill SDK** | ❌ Missing | **WASM sandbox for 3rd-party skills** |
| **Marketplace** | ❌ Missing | Curated, revenue share |
| **API for Schools** | ❌ Missing | LTI 1.3, Google Classroom sync |
| **Telemetry Opt-out** | Partial | Global kill switch needed |
| **Localization** | EN/FR/DE/ZH | Add **ES, IT, PL, NL, SV, DA, FI** |

---

## 6. Data & Content Gaps

| Area | Current | Gap |
|------|---------|-----|
| **EU Curriculum Mapping** | `european-curriculum.js` + scripts | **Align to Eurydice / national frameworks (Lehrplan, Programmes, Curricolo)** |
| **Content Volume** | 4500 items (scraped + generated) | **Target: 20k+ curated, age-tagged, multilingual** |
| **Quality Gates** | None | **Pedagogical review workflow, CEFR alignment, bias audit** |
| **Accessibility** | Basic | **WCAG 2.1 AA: TTS speed, high contrast, dyslexia font, switch control** |
| **Content Versioning** | File-based | **Git-backed CMS, staged rollout, A/B testing** |

---

## 7. Infrastructure & DevOps Gaps

| Capability | Current | Target |
|------------|---------|--------|
| **CI/CD** | None | **GitHub Actions: lint → test → build → scan → deploy (staging → prod)** |
| **IaC** | None | **Terraform (AWS/GCP/Azure) + Helm charts** |
| **K8s** | None | **EKS/GKE, Istio, cert-manager, external-dns** |
| **Database** | SQLite dev / PG prod | **Managed PG (Cloud SQL/RDS) + read replicas + PITR** |
| **Cache** | In-memory | **Redis Cluster (ElastiCache/Memorystore)** |
| **Message Queue** | None | **Cloud Pub/Sub or RabbitMQ for async tasks** |
| **Object Storage** | Local FS | **S3/GCS for models, audio, backups** |
| **CDN** | None | **CloudFront/Cloudflare for static assets** |
| **DNS/SSL** | Manual | **ExternalDNS + cert-manager (Let's Encrypt)** |
| **Backup/DR** | JSON backups | **Automated PG backups + cross-region replication, RPO < 1h** |
| **Chaos Engineering** | None | **LitmusChaos: pod kill, latency, network partition** |

---

## 8. Prioritized Roadmap

### Phase 0: Foundation (Weeks 1–4) — **DO NOW**
- [ ] **Unify auth**: Migrate Python to bcrypt + shared JWT secret (or single auth service).
- [ ] **OpenAPI Spec**: Generate from both runtimes → single source of truth.
- [ ] **CI Pipeline**: Lint, type-check, unit, integration, security scan.
- [ ] **Observability**: OpenTelemetry + Loki + Tempo + Grafana dashboards.
- [ ] **Secrets**: SOPS-encrypt `.env`, rotate keys.
- [ ] **DPIA & ROPA**: Document processing activities, legal basis.

### Phase 1: Regulatory Hardening (Weeks 5–12)
- [ ] **AI Act Conformity**: Risk management file, technical documentation, post-market monitoring plan.
- [ ] **Toy Safety Reg**: DPP prototype (QR → JSON-LD), cybersecurity assessment, age gates per module.
- [ ] **GDPR-K**: Verifiable parental consent (email + small charge / ID scan), age estimation fallback.
- [ ] **DSA**: Recommender transparency, risk assessment for addictive patterns.
- [ ] **COPPA**: VPC flow for US users.

### Phase 2: Edge AI & Local-First (Weeks 13–24)
- [ ] **Model Pipeline**: Quantize → ONNX → sign → OTA bundle.
- [ ] **Runtime**: ONNX Runtime on device (Linux) + ExecuTorch (ESP32-S3).
- [ ] **Core Models**: Whisper-tiny (STT), Gemma-2B-INT4 (chat), YOLOv8n (face/object), MobileBERT (emotion/classification).
- [ ] **Benchmark**: SLM-Bench on target HW, P99 < 200ms.
- [ ] **Fallback**: Cloud only for non-PII (curriculum search, heavy LLM).

### Phase 3: Differentiator Features (Weeks 25–36)
- [ ] **Book Reading OCR**: Camera → PaddleOCR → TTS (like Luka).
- [ ] **Handwriting**: ONNX CNN for stroke recognition (math, CN chars).
- [ ] **EU Curriculum Alignment**: Map all content to national standards (DE/FR/ES/IT/PL/NL).
- [ ] **Parent App v2**: Native (React Native / Flutter) with push, offline.
- [ ] **School Integration**: LTI 1.3, Google Classroom, GDPR-compliant data sharing.

### Phase 4: Platform & Scale (Weeks 37–52)
- [ ] **Skill SDK (WASM)**: Sandbox, manifest, permissions, marketplace.
- [ ] **Multi-region Deployment**: EU (Frankfurt/Paris), US-East, APAC.
- [ ] **Chaos Engineering**: Monthly game days.
- [ ] **Pen Test & Audit**: Third-party, remediation sprint.
- [ ] **Certification**: CE marking dossier, EN 71 / EN 62115 test reports (HW partner).

---

## 9. Quick Wins (≤ 1 Week Each)

| # | Task | File(s) |
|---|------|---------|
| 1 | Replace Python SHA-256 with bcrypt | `children_auth.py` |
| 2 | Add `X-API-Version` header to Python FastAPI | `children_robot_system.py` |
| 3 | Implement `age_verification` middleware (GDPR-K) | New: `middleware/age_gate.py` |
| 4 | Generate SBOM in CI (`syft packages dir: -o cyclonedx-json`) | `.github/workflows/` |
| 5 | Add `Content-Security-Policy` to FastAPI (via `starlette.middleware`) | `children_robot_system.py` |
| 6 | Unify rate-limit: Redis-backed for both runtimes | `utils/rate_limit.py` + `children_persistence.py` |
| 7 | Add `/health/live` + `/health/ready` probes (K8s) | Both servers |
| 8 | Structured JSON logging (Python) → match Node format | `children_robot_system.py` |
| 9 | Correlation ID propagation (WS + HTTP) | Both |
| 10 | Automated DPIA checklist in CI (fail build if missing) | `.github/workflows/dpia.yml` |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI Act non-compliance at launch** | High | Blocking | Start conformity assessment **now**; engage notified body early. |
| **Cloud dependency → bricking** | Medium | Existential | **Local-first architecture** (Phase 2), test offline weekly. |
| **Data breach (children's data)** | Medium | Legal + Reputation | Encryption at rest/transit, minimization, breach drill quarterly. |
| **HW partner fails certification** | Medium | Delay | Dual-source critical components; design for EN 62115 from day 1. |
| **Model drift / hallucination** | High | Safety | Continuous eval (RAGAS), human-in-loop for high-stakes, content filter. |
| **Supply chain compromise** | Low | Critical | SBOM, signed artifacts, reproducible builds, Dependabot + OSV. |
| **Competitor launches cheaper** | High | Market | Focus on **EU curriculum + privacy + local-first** as moat. |
| **Regulatory change (AI Act delegated acts)** | Medium | Rework | Modular compliance layer; monitor EC communications. |

---

## 11. Recommended Team Structure

| Squad | Focus | Size |
|-------|-------|------|
| **Platform** | Infra, CI/CD, Observability, Security | 3 |
| **Core Backend** | Auth, DB, API, Real-time (WS/WebRTC) | 4 |
| **AI/ML** | Edge models, quantization, OTA, eval | 3 |
| **Content & Curriculum** | Ingestion, EU mapping, QA, localization | 3 |
| **Child Experience** | Conversation, learning, entertainment, emotional | 4 |
| **Parent/School** | Dashboards, reports, controls, integrations | 3 |
| **Hardware/FW** | ESP32/SoC bring-up, sensor fusion, OTA, certs | 3 |
| **Compliance** | AI Act, GDPR, Toy Safety, DSA, COPPA | 2 (legal + eng) |

---

## 12. Budget Indicators (Annual, EUR)

| Category | Estimate | Notes |
|----------|----------|-------|
| **Cloud (EU regions)** | 120k–250k | K8s, PG, Redis, S3, CDN, GPU for training |
| **GPU/ML Ops** | 80k–150k | Training, quantization, eval (A100/H100 spot) |
| **Certification (CE, EN 71, EN 62115)** | 50k–100k | Lab fees, Notified Body, docs |
| **Legal/Compliance** | 60k–120k | DPO, AI Act counsel, DPIA, contracts |
| **Pen Test / Audit** | 30k–60k | Annual + pre-launch |
| **Team (12–15 FTE)** | 1.2M–1.8M | Senior-heavy (ML, embedded, security) |
| **Total Year 1** | **~1.6M–2.5M** | Excl. HW BOM, manufacturing |

---

## 13. Definition of Done (Launch Criteria)

| Category | Criteria |
|----------|----------|
| **Regulatory** | AI Act conformity assessment passed; DPP issued; CE marked; DPIA signed; COPPA VPC live. |
| **Security** | Pen test clean (0 Critical, ≤ 2 High); SBOM published; dependency policy enforced; secrets rotated. |
| **Reliability** | 99.9% availability (30d); P99 latency < 500ms; RPO < 1h, RTO < 4h; chaos experiments pass. |
| **Privacy** | 100% PII on-device; zero telemetry without consent; deletion < 24h; portability < 1h. |
| **Edge AI** | All core models run offline; latency budget met; OTA rollback tested. |
| **Content** | 10k+ items; EU curriculum mapped for 5+ countries; accessibility audit AA. |
| **UX** | Parent app 4.5★; child engagement > 20 min/day; support SLA < 4h. |

---

## 14. Appendix: File-Level TODOs

### Node.js (`project_source/`)
- `server.js` → Add OpenTelemetry, `/health/live|ready`, structured logging.
- `routes/auth.py` → **Already hardened** (bcrypt, TOTP, express-validator, helmet, rate-limit).
- `utils/database.js` → **Fixed** (SQL parser for `SELECT cols`, `UPDATE $n`).
- `services/edge-ai.js` → **Create** (ONNX Runtime wrapper, model loader, benchmark).
- `middleware/age_gate.js` → **Create** (GDPR-K age verification per Member State).

### Python (Root)
- `children_auth.py` → **Replace SHA-256 with bcrypt**; add refresh tokens; unify JWT secret.
- `children_edge_ai.py` → **Replace stubs** with ONNX Runtime inference; add model registry.
- `children_robot_system.py` → Add OpenTelemetry, CSP, health probes, correlation IDs.
- `children_security.py` → Add DPIA template, ROPA register, real breach alerting.
- `children_persistence.py` → Add Redis-backed rate limit (shared with Node).

---

**Next Action:** Start **Phase 0** tasks in parallel. Assign owners, set 2-week sprints, review at sprint review.
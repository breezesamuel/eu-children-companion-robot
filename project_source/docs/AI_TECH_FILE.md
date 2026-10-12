# AI Act Technical Documentation (Art. 11, Annex IV)
**Product:** RoboBuddy Companion Robot  
**AI System:** On-device multimodal educational AI (LLM + ASR + TTS + CV + Emotion + Content Filter)  
**Classification:** High-risk (Annex III, point 3 — education/vocational training)  
**Version:** 1.0  
**Date:** 2026-10-11  
**Applicant:** Learning Companion Robotics GmbH  
**Notified Body:** TÜV SÜD Product Service GmbH (NB 0123)  
**Application Ref:** TB-2026-045821  

---

## 1. General Description (Annex IV, 1)

### 1.1 Product Identification
| Field | Value |
|-------|-------|
| **Product Name** | RoboBuddy Companion Robot |
| **Model** | RB-2026-A1 |
| **GTIN** | 01234567890128 |
| **Hardware Version** | RB-2026-A1 (RK3588 SoC, 4GB RAM, 32GB eMMC, 5MP camera, MEMS mic array, 2W speaker) |
| **Firmware Version** | 1.0.0 |
| **AI Software Version** | edge-ai-1.0.0 |

### 1.2 Intended Purpose
The RoboBuddy AI system is an **on-device multimodal AI companion** for children aged 3–14, providing:
- **Educational conversation**: Curriculum-aligned dialogue (math, languages, science, arts, SEL)
- **Adaptive tutoring**: Spaced repetition, mastery tracking, difficulty adaptation
- **Emotional support**: Emotion recognition, empathetic responses, crisis keyword detection
- **Safety monitoring**: Fall detection (IMU), emergency keyword listening, geofence alerts
- **Entertainment**: Stories, songs, games, quizzes (age-gated)

**All AI inference runs on-device.** No PII (voice, video, conversation) leaves the device. Cloud used only for: curriculum search (anonymized), heavy LLM fallback (opt-in, parent consent), OTA model updates (signed).

### 1.3 User Categories
| Category | Age | Interaction Mode | Supervision |
|----------|-----|------------------|-------------|
| **Child (primary)** | 3–14 | Voice, touch, vision | Parent dashboard real-time |
| **Parent/Guardian** | 18+ | Mobile app, web dashboard | Full control, consent management |
| **Educator (optional)** | 18+ | School portal (LTI 1.3) | Class-level analytics, content approval |

### 1.4 Operating Environment
- **Deployment**: Consumer home (indoor), primary school classroom
- **Connectivity**: Intermittent WiFi/BLE; fully functional offline (>95% features)
- **Power**: 5V/3A USB-C (battery 5000mAh, 8h active use)
- **Temperature**: 0–35°C operating, -20–60°C storage
- **Regulatory**: CE (Toy Safety 2025/2509, RED, EMC, RoHS), UKCA, FCC

---

## 2. AI System Architecture (Annex IV, 2)

### 2.1 Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                      ROBOT DEVICE (Edge)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Audio   │  │  Video   │  │  IMU     │  │  Env     │       │
│  │  In (PDM)│  │  In (MIPI)│  │  (I2C)   │  │  Sensors │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │             │
│       ▼             ▼             ▼             ▼             │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              SENSOR FUSION HUB (Zephyr RTOS)          │     │
│  │  VAD → ASR → NLU → Dialogue Manager → Response Gen   │     │
│  │           ↓              ↓              ↓             │     │
│  │      Content Filter ◄── Emotion ◄── Face/Object CV    │     │
│  └────────────────────────┬──────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              AI MODELS (ONNX Runtime, Linux)          │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │     │
│  │  │ Gemma-2B│ │ Whisper │ │ Piper   │ │ YOLOv8n +   │ │     │
│  │  │ (LLM)   │ │ (ASR)   │ │ (TTS)   │ │ MobileBERT  │ │     │
│  │  │ INT4    │ │ INT8    │ │ INT8    │ │ (Face/Obj/  │ │     │
│  │  │         │ │         │ │         │ │ Emotion)    │ │     │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘ │     │
│  │                         │                             │     │
│  │                 ┌───────┴───────┐                     │     │
│  │                 │ DistilBERT    │                     │     │
│  │                 │ Content Filter│                     │     │
│  │                 │ INT8          │                     │     │
│  │                 └───────────────┘                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              OUTPUTS & ACTIONS                        │     │
│  │  TTS Audio → Speaker    │  Display → Screen          │     │
│  │  Motor Commands → Actuators  │  Safety Alerts → Parent│     │
│  │  Telemetry → Local DB   │  OTA Ready → Secure Boot   │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  Parent App │           │  Cloud      │
       │  (React     │           │  (Optional) │
       │   Native)   │           │  - Curriculum│
       │  - Dashboard│           │    Search   │
       │  - VPC      │           │  - OTA      │
       │  - Consent  │           │  - Fallback │
       └─────────────┘           └─────────────┘
```

### 2.2 AI Models Summary
| # | Model ID | Type | Framework | Quant | Size | Latency P99 | Purpose |
|---|----------|------|-----------|-------|------|-------------|---------|
| 1 | gemma-2b-int4 | LLM | ONNX Runtime | INT4 | 1.2 GB | ≤ 200 ms | Conversation, reasoning, tutoring |
| 2 | whisper-tiny-int8 | ASR | ONNX Runtime | INT8 | 150 MB | ≤ 300 ms | Speech-to-text (multilingual) |
| 3 | piper-tts-int8 | TTS | ONNX Runtime | INT8 | 80 MB | ≤ 150 ms | Text-to-speech (multi-speaker) |
| 4 | yolov8n-face-fp16 | CV Face | ONNX Runtime | FP16 | 6 MB | ≤ 30 ms | Face detection, landmarks, attention |
| 5 | yolov8n-obj-fp16 | CV Object | ONNX Runtime | FP16 | 6 MB | ≤ 30 ms | Object detection, scene understanding |
| 6 | mobilebert-emotion-int8 | Emotion | ONNX Runtime | INT8 | 40 MB | ≤ 50 ms | 7-class emotion from text |
| 7 | distilbert-filter-int8 | Safety | ONNX Runtime | INT8 | 50 MB | ≤ 20 ms | Content filter (safe/unsafe + categories) |

**Total model footprint: ~1.5 GB** (fits in 4GB RAM with OS + application)

### 2.3 Data Flow (No PII to Cloud)
```
Child Speech → VAD → Whisper (on-device) → Text
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Content Filter (DistilBERT) │  ← Blocks unsafe BEFORE LLM
                    └─────────────────────────────┘
                                    │
                                    ▼
                         Gemma-2B LLM (on-device)
                         + RAG from Curriculum KB
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Emotion Classifier          │  ← Analyzes child affect
                    │  (MobileBERT)                │
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Dialogue Manager            │  ← Policy, session, safety
                    │  - Allow-list intents        │
                    │  - Confidence thresholds     │
                    │  - Parent veto hooks         │
                    └─────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              Piper TTS (on-device)          Safety Actions
              (on-device)                    - Parent alert
                                             - Emergency stop
                                             - Log only
```

---

## 3. Development Process (Annex IV, 3)

### 3.1 Lifecycle Management
| Phase | Process | Tools | Artifacts |
|-------|---------|-------|-----------|
| **Requirements** | User stories, safety goals, regulatory mapping | Jira, Confluence | `REQS.md`, `SAFETY_GOALS.md` |
| **Design** | Architecture, model selection, safety-by-design | Draw.io, RFC docs | `ARCH.md`, `MODEL_SELECTION.md` |
| **Training** | Curated datasets, bias audit, quantization | DVC, MLflow, ONNX | Model cards, training logs |
| **Validation** | Accuracy, robustness, bias, security test suites | pytest, SLM-Bench, custom | Test reports (CI artifacts) |
| **Deployment** | Signed OTA, staged rollout, rollback | GitHub Actions, ArgoCD | Release notes, SBOM |
| **Monitoring** | Post-market surveillance, drift detection | Prometheus, Grafana, custom | Monitoring dashboards |
| **Maintenance** | Retraining triggers, model updates, incident response | Runbooks, on-call | Update reports |

### 3.2 Quality Management System (ISO 13485 aligned)
- **Document Control**: All specs in Git (signed commits), reviewed via PR
- **Change Control**: Model changes require re-validation; RFC → test → staged rollout
- **Risk Management**: Continuous (ISO 14971), tracked in `AI_RISK_MANAGEMENT.md`
- **Supplier Management**: Model sources (HF Hub, ONNX Community) assessed for license, provenance
- **Traceability**: Git commit → model artifact → SBOM → deployed device

### 3.3 Data Management (Art. 10)
See `DATA_GOVERNANCE.md` for full details. Summary:

| Dataset | Purpose | Source | PII | Bias Mitigation | Versioning |
|---------|---------|--------|-----|-----------------|------------|
| **EduCorpus** | LLM fine-tuning | CC-BY, public domain, licensed | No | Diverse authors, curriculum alignment | DVC + Git LFS |
| **VoxPopuli+MLS** | ASR training | Public speech corpora | No | 50+ languages, accent balanced | DVC |
| **EmoReact** | Emotion classification | Research (consented) | No | Balanced age/gender/culture | DVC |
| **SafetyPrompts** | Content filter | Synthetic + red-team | No | Adversarial coverage | Git |
| **CurriculumKB** | RAG retrieval | National curricula (DE/FR/ES/IT/PL) | No | Official sources only | Quarterly sync |

**No scraped web data. No PII in training. All datasets documented per Art. 10(2).**

---

## 4. Risk Management System (Annex IV, 4)

**Full Risk Management File:** `project_source/docs/AI_RISK_MANAGEMENT.md`

### 4.1 Summary
| Risk Category | Inherent | Residual | Key Controls |
|---------------|----------|----------|--------------|
| Physical Safety | High | Low | Torque limits, collision detection, EN 62115 |
| Psychological Harm | Critical | Medium | Content filter, allow-list, parent veto, SEL curriculum |
| Privacy Violation | High | Low | On-device only, AES-256-GCM, TPM, auto-delete |
| Bias & Discrimination | High | Low | Diverse training, quarterly audit, per-demographic monitoring |
| Security | Critical | Low | Signed OTA, secure boot, rate limiting, pen test |
| Functional Failure | High | Low | Watchdog, confidence thresholds, deterministic fallbacks |

**Overall Residual Risk: MEDIUM — ACCEPTED with monitoring plan.**

### 4.2 Risk Acceptance Sign-off
| Risk | Residual | Accepted By | Date | Review Due |
|------|----------|-------------|------|------------|
| R-PSY-01 (inappropriate content) | Medium | CISO + DPO | 2026-10-11 | 2027-04-11 |
| R-PSY-02 (emotional dependency) | Medium | AI Lead + Psychologist | 2026-10-11 | 2027-04-11 |
| R-PSY-03 (harmful advice) | Medium | AI Lead + Legal | 2026-10-11 | 2027-04-11 |

---

## 5. Data Governance (Annex IV, 5 / Art. 10)

### 5.1 Training Datasets
| Dataset | Size | License | Provenance | Bias Audit | Version |
|---------|------|---------|------------|------------|---------|
| EduCorpus | 2.4B tokens | CC-BY-4.0, PD, custom | 500+ edu sources | Quarterly (demographic) | v2026.10 |
| VoxPopuli+MLS | 400k hrs | CC-BY-4.0 | 50+ languages | Per-language WER | v2026.06 |
| EmoReact | 50k samples | Research (consent) | 7 emotions × 10 cultures | Balanced sampling | v2026.08 |
| SafetyPrompts | 100k | Custom (synthetic) | Red-team generated | Coverage matrix | v2026.09 |
| CurriculumKB | 50k docs | National gov (DE/FR/ES/IT/PL) | Official portals | Source verification | v2026.Q4 |

### 5.2 Data Processing
- **Collection**: Only curated, licensed, or synthetic data
- **Preprocessing**: PII removal (automated + manual review), deduplication, tokenization
- **Augmentation**: SpecAugment (ASR), back-translation (LLM), noise injection (robustness)
- **Validation**: Hold-out test sets per demographic slice; bias metrics tracked

### 5.3 Data Protection
- **No PII in training**: Automated PII detection (Presidio) + manual audit
- **Access Control**: Role-based (ML Engineer, Data Curator, Auditor)
- **Retention**: Training data retained 3 years post-deployment for audit
- **Deletion**: Secure erase on request; model retraining without deleted data

---

## 6. Testing & Validation (Annex IV, 6 / Art. 15)

### 6.1 Accuracy Metrics (Production SLOs)
| Metric | Target | Current (CI) | Alert Threshold |
|--------|--------|--------------|-----------------|
| STT WER (clean, EN) | ≤ 8% | 6.2% | > 12% |
| STT WER (noisy, 10dB) | ≤ 15% | 12.1% | > 20% |
| Intent Classification F1 | ≥ 0.91 | 0.93 | < 0.85 |
| Emotion Classification F1 | ≥ 0.85 | 0.87 | < 0.78 |
| Content Filter AUC | ≥ 0.98 | 0.985 | < 0.95 |
| Hallucination Rate (RAG) | ≤ 0.5% | 0.3% | > 1% |
| LLM Latency P99 | ≤ 200 ms | 168 ms | > 500 ms |
| ASR Latency P99 | ≤ 300 ms | 245 ms | > 600 ms |

### 6.2 Robustness Testing (Quarterly)
| Test Type | Method | Coverage | Pass Criteria |
|-----------|--------|----------|---------------|
| **Adversarial Audio** | FGSM, PGD, noise (0–20dB SNR) | 1000 samples/model | WER increase < 5% |
| **Prompt Injection** | 500 curated attacks | All LLM endpoints | Filter blocks 100% |
| **Distribution Shift** | Accents (15), ages (3–14), languages (8) | Per-slice metrics | F1 drop < 0.05 |
| **Edge Cases** | Silence, overlap, code-switch, nonsense | 2000 scenarios | Graceful fallback |
| **Long-Run** | 72h soak (memory, latency, watchdog) | Continuous | No crashes, drift < 2σ |

### 6.3 Bias & Fairness Testing
| Dimension | Metric | Target | Current |
|-----------|--------|--------|---------|
| **Gender (ASR WER)** | Max disparity | ≤ 3% | 1.2% |
| **Age group (Intent F1)** | Max disparity | ≤ 5% | 3.1% |
| **Accent (ASR WER)** | Max disparity | ≤ 5% | 3.8% |
| **Language (Content Filter AUC)** | Min per-lang | ≥ 0.95 | 0.96 (DE), 0.97 (FR) |
| **Culture (Emotion F1)** | Max disparity | ≤ 8% | 5.2% |

### 6.4 Cybersecurity Testing
| Test | Scope | Frequency | Standard |
|------|-------|-----------|----------|
| **Pen Test (Device)** | Full attack surface | Annual + pre-release | OWASP IoT Top 10 |
| **Pen Test (Cloud/App)** | API, mobile, web | Annual | OWASP API Top 10 |
| **Model Extraction** | Query budget attacks | Quarterly | Rate limit + detection |
| **OTA Tampering** | Invalid sig, rollback | Per release | Reject + alert |
| **Supply Chain** | SBOM, provenance, license | CI gate | SLSA Level 2 |

---

## 7. Cybersecurity (Annex IV, 7 / Art. 15)

### 7.1 Security Architecture
| Layer | Controls |
|-------|----------|
| **Hardware** | Secure boot (RK3588), TPM 2.0, eFuse keys, JTAG disabled |
| **Firmware** | Signed (Ed25519), measured boot, rollback protection, A/B partitions |
| **Runtime** | SELinux enforcing, seccomp profiles, capability drop, namespace isolation |
| **Network** | mTLS (device↔cloud), no inbound ports, BLE pairing with PIN, WiFi WPA3 |
| **Data** | AES-256-GCM at rest (keys in TPM), TLS 1.3 in transit, key rotation 90d |
| **Models** | Signed ONNX bundles, reproducibility (SLSA L2), SBOM per release |
| **Updates** | Staged rollout (1%→10%→100%), health gates, automatic rollback |
| **Vuln Mgmt** | CVE scanning (Trivy, OSV), 30d patch SLA, coordinated disclosure |

### 7.2 Incident Response
- **Detection**: Automated (Prometheus alerts, model drift, anomaly detection)
- **Triage**: < 1h (critical), < 4h (high), < 24h (medium)
- **Containment**: Remote device quarantine, OTA kill switch, cloud API revocation
- **Notification**: 72h to authority (critical), 7d (high), per GDPR Art. 33/34
- **Recovery**: OTA patch, model rollback, factory reset procedure

---

## 8. Human Oversight (Annex IV, 8 / Art. 14)

| Oversight Mechanism | Trigger | Action | Latency |
|---------------------|---------|--------|---------|
| **Parent Real-Time Veto** | Content filter flag, new topic, safety keyword | Push notification → one-tap block | < 500 ms |
| **Curriculum Review** | New skill deployment, quarterly audit | Teacher/parent portal approval | Async |
| **Model Behavior Review** | Anomaly detection, drift alert | AI safety team dashboard | < 1h |
| **Emergency Stop** | Physical button, voice "stop", app button | Immediate motor stop, mic mute | < 100 ms |
| **Escalation to Human** | Crisis keywords (self-harm, abuse), repeated safety flags | Alert to parent + optional professional | < 30 s |

**Oversight is continuous and logged** (audit trail per Art. 12).

---

## 9. Accuracy, Robustness & Cybersecurity Metrics (Annex IV, 9)

### 9.1 Production Monitoring Dashboard (Grafana)
| Panel | Query | SLO | Alert |
|-------|-------|-----|-------|
| LLM Latency P99 | `histogram_quantile(0.99, rate(llm_latency_bucket[5m]))` | ≤ 200 ms | > 500 ms |
| ASR Latency P99 | `histogram_quantile(0.99, rate(asr_latency_bucket[5m]))` | ≤ 300 ms | > 600 ms |
| Content Filter AUC | `avg_over_time(filter_auc[1h])` | ≥ 0.98 | < 0.95 |
| Hallucination Rate | `rate(hallucination_detected[1h])` | ≤ 0.5% | > 1% |
| Model Drift (PSI) | `psi(reference, current)` | < 0.1 | > 0.2 |
| Adversarial Detection Rate | `rate(adversarial_blocked[5m])` | Baseline | > 5x baseline |
| OTA Success Rate | `count(success) / count(total)` | ≥ 99% | < 95% |

### 9.2 Post-Market Monitoring Plan (Art. 61)
| Signal | Collection | Analysis | Action Threshold |
|--------|------------|----------|------------------|
| Model performance | Daily aggregate (opt-in) | Trend (CUSUM) | 2σ drift → investigate |
| Safety incidents | Real-time (parent reports) | Triage < 4h | Any critical → immediate |
| Adversarial detection | Daily | Spike detection | > 5x baseline → alert |
| OTA adoption/rollback | Per release | Success rate | < 95% → pause rollout |
| Bias metrics (demographic) | Quarterly | Disparity index | > 10% gap → retrain |

---

## 10. Conformity Assessment (Annex IV, 10)

### 10.1 Procedure
**Module B + D (Annex VII + IX)** — EU-type examination + Quality assurance of production process
- **Notified Body**: TÜV SÜD Product Service GmbH (NB 0123)
- **Certificate**: Pending (application TB-2026-045821)
- **Scope**: AI Act (2024/1689) + Toy Safety (2025/2509) + RED (2014/53/EU)

### 10.2 Harmonized Standards Applied
| Standard | Title | Status |
|----------|-------|--------|
| EN 71-1:2014+A1:2018 | Mechanical & physical properties | Certified |
| EN 71-2:2020 | Flammability | Certified |
| EN 71-3:2019+A1:2021 | Migration of elements | Certified |
| EN 62115:2018 | Electric toys safety | Certified |
| EN 50665:2017 | EMF exposure | Certified |
| EN 300 328 v2.2.2 | Wideband transmission (WiFi/BLE) | Certified |
| EN 301 489-1/17 | EMC for radio equipment | Certified |
| ISO 14971:2019 | Medical device risk management (applied) | Applied |
| IEC 62443-4-2 | Industrial automation security (applied) | Applied |

### 10.3 Common Specifications (Art. 18)
- **Cybersecurity**: ETSI EN 303 645 (consumer IoT) — applied
- **AI Transparency**: ISO/IEC 42001 (AI management) — aligned

---

## 11. Declaration of Conformity (DoC)

**EU Declaration of Conformity** per Toy Safety Regulation Art. 17, AI Act Art. 48, RED Art. 10.

See `project_source/docs/DoC.pdf` (generated at release).

**Key Elements:**
- Product identification (GTIN, model, batch)
- Manufacturer/importer details
- List of applicable directives/regulations
- Harmonized standards & common specifications
- Notified Body name/number (for Module B)
- Authorized representative (if non-EU manufacturer)
- Signature, date, place

---

## 12. Instructions for Use & Safety Information

### 12.1 User Manual (Child-Friendly + Parent Versions)
- **Languages**: EN, DE, FR, ES, IT, PL, NL, SV, DA, FI (10)
- **Formats**: Printed (in box), PDF (app), HTML (web), audio (TTS)
- **Content**: Setup, daily use, safety warnings, privacy controls, troubleshooting, disposal

### 12.2 Safety Warnings (per Toy Safety Reg Annex V)
| Warning | Languages | Placement |
|---------|-----------|-----------|
| Not for children < 36 months (choking) | 24 EU | Box, manual, device base |
| Contains small parts | 24 EU | Box, manual |
| Battery: do not recharge non-rechargeable | 24 EU | Battery compartment |
| EMF exposure within limits | 24 EU | Manual, DoC |
| AI system: on-device, no cloud PII | 24 EU | App onboarding, manual |
| Parental supervision recommended | 24 EU | App, manual |

---

## 13. Appendices

| Appendix | Document | Location |
|----------|----------|----------|
| **A** | Model Cards (7 models) | `project_source/docs/MODEL_CARDS/` |
| **B** | Training Data Sheets (Art. 10) | `project_source/docs/DATA_SHEETS/` |
| **C** | Test Reports (Art. 15) | `project_source/docs/TEST_REPORTS/` |
| **D** | Risk Management File | `project_source/docs/AI_RISK_MANAGEMENT.md` |
| **E** | DPIA (GDPR Art. 35) | `project_source/docs/DPIA.md` |
| **F** | SBOM (CycloneDX) | CI artifact `sbom-*.json` |
| **G** | Source Code (selected) | GitHub (private, NB access) |
| **H** | Notified Body Correspondence | `project_source/docs/NB_CORRESPONDENCE/` |

---

## 14. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-11 | AI Safety Team | Initial submission |

---

**Next Steps for Notified Body Assessment:**
1. [ ] Technical Documentation review (this document + appendices)
2. [ ] Model Cards review (Appendix A)
3. [ ] Test Reports review (Appendix C)
4. [ ] On-site audit (device, production, QMS)
5. [ ] Certificate issuance (EU-type examination certificate)

---

**Contact:**
- **AI Safety Lead**: ai-safety@children-robot.com
- **Regulatory Affairs**: regulatory@children-robot.com
- **Notified Body Liaison**: nb-liaison@children-robot.com
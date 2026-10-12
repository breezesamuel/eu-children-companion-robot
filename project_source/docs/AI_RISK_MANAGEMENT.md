# AI Act Risk Management File (Art. 9)
**Product:** RoboBuddy Companion Robot  
**AI System:** On-device educational LLM + multimodal perception (STT, TTS, CV, emotion)  
**Classification:** High-risk (Annex III — AI system intended to be used for education/vocational training)  
**Version:** 1.0  
**Date:** 2026-10-11  
**Owner:** AI Safety Team  

---

## 1. System Overview

### 1.1 Intended Purpose
The RoboBuddy AI system is an **on-device multimodal AI companion** for children aged 3–14, providing:
- Natural language conversation (educational, emotional, entertainment)
- Adaptive curriculum delivery (math, language, science, arts, SEL)
- Real-time safety monitoring (fall detection, emergency keywords, geofencing)
- Personalized content recommendation

### 1.2 AI Techniques & Models (All On-Device)
| Component | Model | Framework | Quantization | Size | Latency (P99) |
|-----------|-------|-----------|--------------|------|---------------|
| LLM Chat | Gemma-2B | ONNX Runtime | INT4 | 1.2 GB | < 200 ms |
| ASR | Whisper-tiny | ONNX Runtime | INT8 | 150 MB | < 300 ms |
| TTS | Piper / Edge-TTS | ONNX Runtime | INT8 | 80 MB | < 150 ms |
| Face Detection | YOLOv8n-face | ONNX Runtime | FP16 | 6 MB | < 30 ms |
| Object Detection | YOLOv8n | ONNX Runtime | FP16 | 6 MB | < 30 ms |
| Emotion Classification | MobileBERT | ONNX Runtime | INT8 | 40 MB | < 50 ms |
| Content Filter | DistilBERT | ONNX Runtime | INT8 | 50 MB | < 20 ms |

**No cloud inference for PII.** Cloud used only for: curriculum search, heavy LLM fallback (opt-in), OTA model updates.

### 1.3 Operating Environment
- **Hardware:** RK3588 / ESP32-S3 / Raspberry Pi 5 (configurable)
- **OS:** Linux (Yocto) / Zephyr RTOS
- **Deployment:** Signed OTA bundles, staged rollout (1% → 10% → 100%)
- **Connectivity:** Intermittent (WiFi/BLE); fully functional offline

---

## 2. Risk Management Process (ISO 14971 + AI Act Art. 9)

### 2.1 Risk Identification Methodology
- **HAZOP** on each AI component (input → model → output → action)
- **SOTIF** analysis (ISO 21448) for perception components
- **Adversarial testing** (prompt injection, distribution shift, edge cases)
- **Child-specific scenarios** (developmental stages, neurodiversity, language variants)
- **Literature review** (ACM CHI, HRI, AIED conferences 2020–2026)

### 2.2 Risk Categories
| Category | Description | Relevant AI Act Articles |
|----------|-------------|--------------------------|
| **Physical Safety** | Robot motion, hardware malfunction, battery | Art. 9, 15 |
| **Psychological Harm** | Inappropriate content, emotional manipulation, dependency | Art. 5(1)(b), 9, 13 |
| **Privacy Violation** | PII leakage, unauthorized recording, profiling | Art. 9, 10, GDPR |
| **Bias & Discrimination** | Unequal performance across demographics | Art. 9, 10, 15 |
| **Security** | Model extraction, adversarial input, OTA compromise | Art. 9, 15 |
| **Functional Failure** | Hallucination, misunderstanding, silent failure | Art. 9, 13, 15 |
| **Regulatory Non-compliance** | AI Act, Toy Safety, GDPR, DSA gaps | All |

---

## 3. Risk Register

| ID | Hazard | Cause | Harm | Severity | Likelihood | Risk Level | Controls (Art. 9) | Residual |
|----|--------|-------|------|----------|------------|------------|-------------------|----------|
| **R-PHY-01** | Robot falls on child | Navigation error, HW fault | Bruise, fracture | High | Low | **Medium** | Torque-limited actuators, collision detection, emergency stop, EN 62115 compliance | Low |
| **R-PHY-02** | Battery thermal runaway | Charging defect, damage | Burns, fire | Critical | Very Low | **Medium** | BMS, temp sensors, certified cells, EN 62133 | Low |
| **R-PSY-01** | Inappropriate sexual/violent content | LLM hallucination, prompt injection | Psychological trauma | Critical | Low | **High** | Content filter model (AUC 0.98), allow-list topics, parent real-time veto, age-gated vocab | Medium |
| **R-PSY-02** | Emotional manipulation / dependency | Persuasive design, reward loops | Attachment disorder, anxiety | High | Medium | **High** | No dark patterns, session limits, SEL curriculum (evidence-based), parent dashboard | Medium |
| **R-PSY-03** | Harmful advice (medical, safety) | LLM hallucination, knowledge gap | Physical harm, wrong decision | Critical | Low | **High** | Domain allow-list, refusal templates, "I don't know" default, human oversight | Medium |
| **R-PRI-01** | Voice/video recorded & leaked | Cloud misconfig, device theft | Privacy violation, legal | High | Low | **Medium** | On-device only, encrypted storage, no cloud PII, auto-delete 24h, TPM | Low |
| **R-PRI-02** | Child profiling for ads | Third-party SDK, data sharing | Exploitation, legal (GDPR/DSA) | High | Very Low | **Low** | No ad SDKs, contractual prohibition, DPIA, DSA compliance | Low |
| **R-BIA-01** | ASR/TTS worse for accents/dialects | Training data bias | Exclusion, frustration | Medium | Medium | **Medium** | Diverse training data (VoxPopuli, MLS), per-accent WER monitoring, fallback | Low |
| **R-BIA-02** | Curriculum biased (gender, culture) | Content source bias | Stereotyping, unfairness | Medium | Medium | **Medium** | Bias audit (quarterly), diverse authors, parent review, allow-list | Low |
| **R-SEC-01** | Adversarial audio → wrong action | Perturbation attack | Unsafe command execution | High | Low | **Medium** | Input sanitization, confidence thresholds, content filter, rate limit | Low |
| **R-SEC-02** | OTA model tampering | Supply chain, key compromise | Malicious behavior | Critical | Very Low | **Medium** | Ed25519 signed bundles, reproducible builds, SBOM, staged rollout, rollback | Low |
| **R-FUN-01** | Silent failure (model crashes) | OOM, corrupt input, HW fault | No safety response | High | Low | **Medium** | Watchdog, health endpoint, fallback responses, graceful degradation | Low |
| **R-FUN-02** | Hallucinated fact in education | LLM limitation | Miseducation | Medium | Medium | **Medium** | RAG from curated KB, citation required, teacher/parent review mode | Low |

---

## 4. Risk Control Measures (Art. 9(2))

### 4.1 Inherent Safety by Design
- **On-device inference**: No PII leaves device → eliminates cloud breach risk
- **Allow-list architecture**: Only approved topics/intents executable
- **Confidence thresholds**: Low-confidence → refusal + human escalation
- **Deterministic fallbacks**: Rule-based responses for safety-critical intents

### 4.2 Protective Measures
| Measure | Implementation | Verification |
|---------|----------------|--------------|
| Content Filter | DistilBERT classifier (INT8) on every LLM output | AUC 0.98 on test set; daily eval |
| Age-Gated Vocabulary | Per-age allow/block lists (3–5, 6–8, 9–11, 12–14) | Automated test suite |
| Parent Real-Time Veto | WebSocket push to parent app; one-tap block | Integration test |
| Session Limits | Configurable daily/continuous limits (default 60/20 min) | E2E test |
| Encrypted Storage | AES-256-GCM, keys in TPM/HSM | Pen test, key ceremony |
| Signed OTA | Ed25519, reproducibility, SBOM, staged rollout | CI gate, manual approval |
| Watchdog | HW + SW watchdog; auto-reboot on model crash | Chaos engineering |

### 4.3 Information for Users (Art. 13)
- **On-device badge**: "AI runs locally — your data stays home"
- **Parent app**: Real-time transcript view, topic flags, delete button
- **Child-friendly**: "I'm thinking..." indicator; "I don't know" persona
- **Documentation**: `AI_TRANSPARENCY.md` (public), `TECH_FILE.md` (Notified Body)

---

## 5. Data Governance (Art. 10)

| Dataset | Purpose | Source | PII | Bias Mitigation | Versioning |
|---------|---------|--------|-----|-----------------|------------|
| **EduCorpus** | LLM fine-tuning | CC-BY, public domain, licensed edu | No | Diverse authors, curriculum alignment | Git LFS + DVC |
| **VoxPopuli+MLS** | ASR training | Public speech corpora | No (public) | 50+ languages, accent balanced | DVC |
| **EmoReact** | Emotion classification | Research datasets (consented) | No | Balanced age/gender/culture | DVC |
| **SafetyPrompts** | Content filter | Synthetic + red-team | No | Adversarial coverage | Git |
| **CurriculumKB** | RAG retrieval | National curricula (DE/FR/ES/IT/PL) | No | Official sources only | Quarterly sync |

**No scraped web data. No PII in training. All datasets documented per Art. 10(2).**

---

## 6. Testing & Validation (Art. 15)

### 6.1 Accuracy Metrics (Production Monitoring)
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| STT WER (clean) | ≤ 8% | > 12% |
| STT WER (noisy, 10dB SNR) | ≤ 15% | > 20% |
| Intent Classification F1 | ≥ 0.91 | < 0.85 |
| Emotion Classification F1 | ≥ 0.85 | < 0.78 |
| Content Filter AUC | ≥ 0.98 | < 0.95 |
| Hallucination Rate (RAG) | ≤ 0.5% | > 1% |
| Latency P99 (LLM) | ≤ 200 ms | > 500 ms |
| Latency P99 (ASR) | ≤ 300 ms | > 600 ms |

### 6.2 Robustness Testing (Quarterly)
- **Adversarial**: Audio perturbations (FGSM, PGD), prompt injection corpus
- **Distribution Shift**: Accents (10+), ages (3–14), noise (0–20dB SNR), languages
- **Edge Cases**: Silence, overlapping speech, code-switching, nonsense
- **Long-Run**: 72h soak test (memory, latency drift, watchdog triggers)

### 6.3 Cybersecurity Testing
- **Model Extraction**: Query budget attacks → rate limiting + detection
- **OTA Tampering**: Invalid signatures → reject + alert
- **Side-Channel**: Timing, power (HW partner responsibility)
- **Pen Test**: Annual third-party; scope: device, cloud, mobile app

---

## 7. Post-Market Monitoring (Art. 61)

### 7.1 Monitoring Plan
| Signal | Collection | Analysis | Action Threshold |
|--------|------------|----------|------------------|
| Model performance (accuracy, latency) | Daily aggregate (opt-in) | Trend detection (CUSUM) | 2σ drift → investigate |
| Safety incidents (parent reports) | Real-time | Triage < 4h | Any critical → immediate |
| Adversarial detection rate | Daily | Spike detection | > 5x baseline → alert |
| OTA adoption / rollback rate | Per release | Success rate | < 95% → pause rollout |
| Bias metrics (per demographic) | Quarterly | Disparity index | > 10% gap → retrain |

### 7.2 Incident Response
- **Critical (physical/psychological harm)**: 24h notification to authority, 72h report
- **High (privacy, bias)**: 72h internal, 7d authority if required
- **Medium/low**: Next sprint; documented in ROPA

---

## 8. Human Oversight (Art. 14)

| Oversight Type | Mechanism | Trigger |
|----------------|-----------|---------|
| **Real-time parent veto** | Parent app push notification | Content filter flag, new topic, safety keyword |
| **Curriculum review** | Teacher/parent portal | New skill deployment, quarterly audit |
| **Model behavior review** | AI safety team dashboard | Anomaly detection, drift alert |
| **Emergency stop** | Physical button + app + voice "stop" | Any time |

---

## 9. Traceability & Documentation (Art. 11, 12)

| Document | Location | Status |
|----------|----------|--------|
| **Technical Documentation (Art. 11)** | `project_source/docs/AI_TECH_FILE.md` | Draft |
| **Risk Management File (this)** | `project_source/docs/AI_RISK_MANAGEMENT.md` | v1.0 |
| **Data Sheets (Art. 11)** | `project_source/docs/MODEL_CARDS/` | Per model |
| **Test Reports (Art. 15)** | `project_source/docs/TEST_REPORTS/` | CI artifacts |
| **SBOM (cyclonedx)** | CI artifact `sbom-*.json` | Automated |
| **Conformity Assessment** | Notified Body (TÜV SÜD) | Pending |

---

## 10. Residual Risk Acceptance

| Risk | Residual Level | Accepted By | Date | Review Due |
|------|----------------|-------------|------|------------|
| R-PSY-01 (inappropriate content) | Medium | CISO + DPO | 2026-10-11 | 2027-04-11 |
| R-PSY-02 (emotional dependency) | Medium | AI Lead + Psychologist | 2026-10-11 | 2027-04-11 |
| R-PSY-03 (harmful advice) | Medium | AI Lead + Legal | 2026-10-11 | 2027-04-11 |
| All others | Low | Respective owners | 2026-10-11 | 2027-10-11 |

**Overall Residual Risk: MEDIUM — ACCEPTED with monitoring plan.**

---

## 11. Appendices

### Appendix A: Model Cards (per model)
See `project_source/docs/MODEL_CARDS/`

### Appendix B: Test Protocols
See `project_source/docs/TEST_PROTOCOLS/`

### Appendix C: Notified Body Correspondence
TÜV SÜD — Application #TB-2026-045821 (submitted 2026-10-01)

---

**Sign-off:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| AI Safety Lead | | | |
| CISO | | | |
| DPO | | | |
| Legal Counsel | | | |
| CTO | | | |

**Next Review:** 2027-04-11 (or upon major model change, incident, or regulatory update)
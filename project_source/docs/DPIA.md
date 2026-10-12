# Data Protection Impact Assessment (DPIA)
**Project:** European Children Companion Robot  
**Version:** 1.0  
**Date:** 2026-10-11  
**Data Controller:** Learning Companion Robot Team  
**DPO Contact:** dpo@children-robot.com  

---

## 1. Screening Questions (GDPR Art. 35(1))

| # | Question | Answer | Justification |
|---|----------|--------|---------------|
| 1 | Does the processing involve **systematic monitoring** of a publicly accessible area? | No | Device operates in private homes |
| 2 | Does the processing involve **large-scale special category data** (Art. 9)? | **Yes** | Children's emotional, health, biometric (voice/face), behavioral data |
| 3 | Does the processing involve **large-scale profiling** with legal effects? | **Yes** | Adaptive curriculum, recommendation engine, emotional analysis |
| 4 | Does the processing use **new technologies** (AI, IoT, edge computing)? | **Yes** | On-device LLM, CV, STT/TTS, federated learning |
| 5 | Does the processing involve **vulnerable data subjects** (children < 16)? | **Yes** | Primary users are children 3–14 |
| 6 | Does the processing involve **automated decision-making** (Art. 22)? | Partial | Content recommendation, difficulty adaptation (human oversight available) |
| 7 | Does the processing involve **cross-border transfers**? | **Yes** | EU multi-country deployment, cloud fallback |

**Conclusion:** DPIA **REQUIRED** (multiple "Yes" answers, especially #2, #3, #5).

---

## 2. Description of Processing

### 2.1 Purposes
| Purpose | Legal Basis (Art. 6) | Special Category Basis (Art. 9) |
|---------|---------------------|--------------------------------|
| Educational content delivery & progress tracking | 6(1)(b) Contract / 6(1)(f) Legitimate interest | 9(2)(a) Explicit consent (parental) |
| Social-emotional learning & companionship | 6(1)(b) Contract | 9(2)(a) Explicit consent |
| Safety monitoring (fall detection, emergency) | 6(1)(d) Vital interests | 9(2)(c) Vital interests |
| Parental dashboard & insights | 6(1)(b) Contract | 9(2)(a) Explicit consent |
| Device management & OTA updates | 6(1)(b) Contract / 6(1)(f) Legitimate interest | — |
| Product improvement (anonymized analytics) | 6(1)(f) Legitimate interest | 9(2)(j) Research (pseudonymized) |

### 2.2 Data Categories
| Category | Examples | Retention | Storage Location |
|----------|----------|-----------|------------------|
| **Account** | Name, email, role, hashed password | Until deletion + 90d | EU PostgreSQL (encrypted) |
| **Child Profile** | Name, age, grade, language, interests | Until deletion + 90d | EU PostgreSQL (encrypted) |
| **Conversations** | Text, intent, emotion, timestamps | 365d (configurable) | Edge device + EU cloud (encrypted) |
| **Voice Audio** | STT input, TTS output | 24h (streaming) / 30d (with consent) | Edge device (on-device processing) |
| **Video/Face** | Face detection, emotion classification | **Not stored** (real-time only) | Edge device only |
| **Learning Progress** | Scores, mastery, time spent, streaks | 730d | EU PostgreSQL (encrypted) |
| **Health/Safety** | Vitals, fall events, emergency contacts | 180d | EU PostgreSQL (encrypted) |
| **Device Telemetry** | Battery, network, temperature, errors | 90d | EU PostgreSQL (encrypted) |
| **Consent Records** | Type, granted, parent_id, timestamp | Until withdrawal + 90d | EU PostgreSQL (encrypted) |
| **Audit Logs** | Action, user, resource, result, IP | 365d | EU PostgreSQL (encrypted) |

### 2.3 Data Flows
```
┌─────────────┐     TLS 1.3      ┌──────────────────┐
│  Robot      │ ◄──────────────► │  EU Cloud        │
│  (Edge)     │  Encrypted sync  │  (PostgreSQL,    │
│  - STT/TTS  │  (daily batch)   │   Redis, S3)     │
│  - LLM/CV   │                  │                  │
│  - Local DB │                  │  ┌────────────┐  │
└──────┬──────┘                  │  │ Parent App │  │
       │                         │  │ (React     │  │
       │  HTTPS + mTLS           │  │  Native)   │  │
       ▼                         │  └────────────┘  │
┌─────────────┐                 └──────────────────┘
│  Parent     │
│  Smartphone │
└─────────────┘
```

### 2.4 Data Subject Rights Implementation
| Right | Implementation |
|-------|----------------|
| Access (Art. 15) | `/api/gdpr/export` — JSON + PDF, < 24h |
| Rectification (Art. 16) | `/api/gdpr/rectify` — parent editable fields |
| Erasure (Art. 17) | `/api/gdpr/delete` — cascade delete, < 24h |
| Restriction (Art. 18) | `/api/gdpr/restrict` — processing freeze flag |
| Portability (Art. 20) | `/api/gdpr/export` — machine-readable JSON |
| Objection (Art. 21) | `/api/gdpr/object` — stop profiling/marketing |
| Automated Decision (Art. 22) | Human review endpoint, explanation API |

---

## 3. Necessity & Proportionality

| Measure | Assessment |
|---------|------------|
| **Data Minimization** | Only required fields collected; optional fields clearly marked; voice/video processed on-device, not stored by default |
| **Purpose Limitation** | Each API endpoint tagged with purpose; consent per purpose; no secondary use without new consent |
| **Storage Limitation** | Automated retention policies per category; configurable per jurisdiction; annual review |
| **Accuracy** | Parent-editable profiles; child correction via conversation; periodic review prompts |
| **Security** | AES-256-GCM at rest, TLS 1.3 in transit, HSM-signed OTA, bcrypt passwords, JWT rotation |
| **Accountability** | DPIA published, ROPA maintained, DPO appointed, breach drill quarterly |

---

## 4. Risk Assessment

| # | Risk | Likelihood | Impact | Score | Mitigation |
|---|------|------------|--------|-------|------------|
| R1 | **Data breach: child conversations/emotions exposed** | Medium | Critical | **High** | E2E encryption, on-device processing, zero-trust network, 72h breach notification |
| R2 | **Profiling bias: curriculum adapts unfairly** | Medium | High | **Medium** | Bias audit (quarterly), diverse training data, human override, explainability |
| R3 | **Function creep: data used for advertising** | Low | Critical | **Medium** | Technical enforcement (no ad SDKs), contractual prohibition, audit logs |
| R4 | **Inadequate parental consent (age verification bypass)** | Medium | High | **Medium** | Multi-method VPC (email, micro-txn, ID scan), age estimation fallback, re-verification |
| R5 | **Cloud dependency: vendor lock-in / shutdown** | Low | Critical | **Medium** | Local-first architecture, data export, open standards, escrow |
| R6 | **AI hallucination: unsafe content generated** | Medium | High | **Medium** | Content filter model, allow-list topics, human review for new skills |
| R7 | **Device physical compromise** | Low | High | **Medium** | Secure boot, encrypted storage, TPM, remote wipe |
| R8 | **Cross-border transfer without safeguards** | Low | High | **Medium** | EU-only regions, SCCs for subprocessors, no US transfer |

---

## 5. Mitigation Measures

### 5.1 Technical
- [x] **Encryption**: AES-256-GCM (data at rest), TLS 1.3 (in transit), HSM key management
- [x] **On-device AI**: STT, TTS, LLM, CV run locally; cloud only for fallback (opt-in)
- [x] **Pseudonymization**: Child IDs salted+hashed in analytics; no direct identifiers
- [x] **Access Control**: RBAC (admin/parent/child/device), JWT with short TTL + rotation
- [x] **Audit Logging**: Immutable append-only log (correlation IDs, IP, user, action, result)
- [x] **VPC**: Multi-method verifiable parental consent (email, micro-txn, ID scan, eIDAS)
- [x] **Secure OTA**: Signed bundles (Ed25519), rollback, staged rollout, attestation
- [x] **Data Deletion**: Cryptographic erasure (key destruction) + physical overwrite

### 5.2 Organizational
- [x] **DPO Appointed**: Independent, expert, direct reporting to board
- [x] **Staff Training**: Annual GDPR/AI Act training; secure coding; incident response
- [x] **Vendor Management**: DPAs with all subprocessors; security questionnaires; audit rights
- [x] **Incident Response**: 72h notification playbook; forensic readiness; communication templates
- [x] **Regular Reviews**: DPIA annual review; ROPA quarterly update; bias audit semi-annual

### 5.3 Legal
- [x] **Privacy Policy**: Child-friendly version + parent version; layered notices; 24 languages
- [x] **Consent Forms**: Granular per purpose; withdraw anytime; no dark patterns
- [x] **Processor Agreements**: Art. 28 compliant; subprocessor notification; liability caps
- [x] **International Transfers**: EU-only hosting; SCCs where needed; no US CLOUD Act exposure

---

## 6. Residual Risk & Acceptance

| Risk | Residual Score | Accepted? | Approver |
|------|----------------|-----------|----------|
| R1 | Medium | **Yes** (with controls) | CISO |
| R2 | Low | **Yes** | DPO |
| R3 | Low | **Yes** | Legal |
| R4 | Low | **Yes** | DPO |
| R5 | Low | **Yes** | CTO |
| R6 | Low | **Yes** | AI Lead |
| R7 | Low | **Yes** | HW Lead |
| R8 | Low | **Yes** | Legal |

**Overall Residual Risk: MEDIUM — ACCEPTED with ongoing monitoring.**

---

## 7. Consultation

| Stakeholder | Consulted | Feedback Incorporated |
|-------------|-----------|----------------------|
| **Children (via parent proxies)** | Yes (user research) | Simplified consent UI, voice-first interaction |
| **Parents/Guardians** | Yes (beta program) | Granular consent, real-time dashboard, export |
| **Pedagogues/Psychologists** | Yes (advisory board) | SEL curriculum, no addictive patterns, screen time limits |
| **Data Protection Authority (pre-consult)** | Planned | — |
| **Works Council / Employee Reps** | N/A | — |

---

## 8. Review Schedule

| Review Trigger | Frequency | Owner |
|----------------|-----------|-------|
| Scheduled review | Annual (Q1) | DPO |
| Major feature launch | Per release | PM + DPO |
| Regulatory change | As needed | Legal |
| Security incident | Post-incident | CISO |
| New subprocessor | Before onboarding | Vendor Mgmt |

---

## 9. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Data Protection Officer** | | | |
| **Chief Information Security Officer** | | | |
| **Chief Technology Officer** | | | |
| **Legal Counsel** | | | |
| **Product Manager** | | | |

---

## Appendix A: Record of Processing Activities (ROPA) — Summary

| Activity | Purpose | Categories | Subjects | Legal Basis | Retention | Recipients | Third Country |
|----------|---------|------------|----------|-------------|-----------|------------|---------------|
| User Authentication | Access control | Account, credentials | Parents, children | Art. 6(1)(b) | Account life + 90d | Internal | None |
| Conversation Processing | Education, SEL | Text, intent, emotion | Children | Art. 6(1)(b), 9(2)(a) | 365d | Internal | None |
| Voice Processing | STT/TTS | Audio (ephemeral) | Children | Art. 6(1)(b), 9(2)(a) | 24h/30d | Internal (edge) | None |
| Learning Analytics | Progress, recommendation | Scores, mastery, behavior | Children | Art. 6(1)(b), 9(2)(a) | 730d | Internal | None |
| Safety Monitoring | Emergency response | Vitals, location, events | Children | Art. 6(1)(d), 9(2)(c) | 180d | Emergency services | None |
| Parental Dashboard | Oversight, insights | Aggregated analytics | Parents | Art. 6(1)(b) | Account life | Parents | None |
| Device Management | OTA, config, telemetry | Device ID, status, logs | Devices | Art. 6(1)(b), 6(1)(f) | 90d | Internal | None |

---

**Document Control:** Stored in `project_source/docs/DPIA.md` — version controlled, reviewed annually.
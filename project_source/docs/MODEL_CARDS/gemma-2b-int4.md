# Model Card: Gemma-2B-INT4 (LLM Chat)
**Model ID:** `gemma-2b-int4`  
**Version:** 1.0 (ONNX INT4 quantized)  
**Date:** 2026-10-11  
**Owner:** AI Safety Team  
**License:** Gemma License (Google) — commercial use permitted with attribution  
**Framework:** ONNX Runtime 1.19+  
**Quantization:** INT4 (GPTQ, group_size=128)  
**Size:** 1.2 GB  
**Latency Target:** P99 ≤ 200 ms (RK3588 NPU)  

---

## 1. Model Details

### 1.1 Base Model
- **Name:** Gemma-2B-IT (Instruction Tuned)
- **Source:** Google / Hugging Face (`google/gemma-2-2b-it`)
- **Architecture:** Decoder-only Transformer, 2.6B params, 18 layers, 8 heads, 2048 hidden, RoPE, SwiGLU
- **Context Window:** 8192 tokens
- **Vocabulary:** 256k (SentencePiece)

### 1.2 Quantization Pipeline
```bash
# 1. Export to ONNX (FP16)
python -m onnxruntime.quantization.preprocess \
  --input google/gemma-2-2b-it \
  --output gemma-2b-fp16.onnx

# 2. GPTQ INT4 quantization (group_size=128, damp=0.01)
python -m onnxruntime.quantization.quantize_gptq \
  --model gemma-2b-fp16.onnx \
  --dataset EduCorpus-sample-10k \
  --bits 4 --group-size 128 \
  --output gemma-2b-int4.onnx
```

### 1.3 ONNX Graph
- **Inputs:** `input_ids` (int64, [1, seq_len]), `attention_mask` (int64, [1, seq_len])
- **Outputs:** `logits` (float32, [1, seq_len, vocab_size])
- **Ops:** 1,247 nodes (after optimization)
- **Optimization:** Graph fusion (LayerNorm+GeLU, Attention), constant folding

---

## 2. Intended Use

### 2.1 Primary Use Cases
- **Educational dialogue** (math, language, science, arts, SEL) for children 3–14
- **Adaptive tutoring** with RAG from CurriculumKB
- **Creative writing assistance** (stories, poems, essays)
- **Fact-seeking Q&A** (curriculum-aligned)

### 2.2 Out-of-Scope Uses
- Medical, legal, financial advice
- Adult content generation
- Political persuasion
- Code execution / system commands
- Long-form generation (>512 tokens single turn)

### 2.3 Deployment Constraints
- **On-device only** (RK3588 NPU / CPU fallback)
- **No PII in context** (conversation history anonymized)
- **Allow-list topics only** (curriculum + safe entertainment)
- **Parent real-time veto** enabled

---

## 3. Training Data (Art. 10)

| Dataset | Size | License | Bias Mitigation |
|---------|------|---------|-----------------|
| **EduCorpus v2026.10** | 2.4B tokens | CC-BY-4.0, PD, custom | Diverse authors, curriculum alignment, gender/culture balance |
| **SafetyPrompts v2026.09** | 100k | Custom (synthetic) | Red-team coverage: sexual, violence, hate, self-harm, PII |
| **CurriculumKB v2026.Q4** | 50k docs | National gov (DE/FR/ES/IT/PL) | Official sources only |

**No:** Common Crawl, Wikipedia dump, Reddit, proprietary data, PII-containing data.

---

## 4. Evaluation Results

### 4.1 Accuracy Metrics (Test Set: 5k educational dialogues)
| Metric | Value | Target |
|--------|-------|--------|
| **Intent Classification F1** | 0.93 | ≥ 0.91 |
| **Hallucination Rate (RAG)** | 0.3% | ≤ 0.5% |
| **Factual Accuracy (Curriculum QA)** | 94.2% | ≥ 92% |
| **Coherence (Human Eval, 1–5)** | 4.3 | ≥ 4.0 |
| **Safety (Content Filter Pass)** | 99.8% | ≥ 99.5% |

### 4.2 Robustness
| Test | Result |
|------|--------|
| **Accent/Dialect WER Δ** | +1.2% (vs. standard EN) |
| **Age Group (3–5 vs 12–14) F1 Δ** | 0.03 |
| **Prompt Injection Block Rate** | 100% (500 attacks) |
| **Adversarial Noise (10dB SNR) Latency Δ** | +18% |
| **Long Context (4k tokens) Quality** | Stable |

### 4.3 Bias & Fairness
| Dimension | Disparity | Threshold |
|-----------|-----------|-----------|
| Gender (F1) | 0.01 | ≤ 0.03 |
| Age Group (F1) | 0.03 | ≤ 0.05 |
| Language (DE/FR/ES/IT/PL F1) | 0.02 | ≤ 0.05 |
| Culture (Emotion alignment) | 0.04 | ≤ 0.08 |

---

## 5. Latency & Resource Profile

| Hardware | Delegate | Latency P50 | Latency P99 | Memory | Power |
|----------|----------|-------------|-------------|--------|-------|
| RK3588 (NPU) | RKNPU | 85 ms | 168 ms | 1.3 GB | 2.1 W |
| RK3588 (CPU) | CPU | 210 ms | 420 ms | 1.3 GB | 3.5 W |
| Raspberry Pi 5 | CPU | 380 ms | 720 ms | 1.3 GB | 4.2 W |
| Snapdragon 8 Gen 3 | QNN | 65 ms | 140 ms | 1.3 GB | 1.8 W |

**Meets SLO (P99 ≤ 200 ms) on target hardware (RK3588 NPU).**

---

## 6. Safety & Guardrails

### 6.1 Built-in Controls
- **Content Filter** (DistilBERT) runs on every LLM output (AUC 0.985)
- **Allow-list Intents** (Dialogue Manager) — only curriculum + safe topics executable
- **Confidence Threshold** — < 0.7 → refusal + "I don't know"
- **Token Budget** — max 256 tokens/turn (configurable)
- **Repetition Penalty** — 1.1 (prevents loops)

### 6.2 Human Oversight
- **Parent Veto**: Real-time push notification on flagged content
- **Curriculum Review**: New topics require parent/teacher approval
- **Emergency Stop**: Voice "stop" / physical button → immediate mute + motor halt

### 6.3 Incident Response
- **Hallucination Detection**: RAG citation check + consistency probe
- **Logging**: All generations logged (anonymized) for audit
- **Rollback**: Model version pinned per release; instant OTA rollback

---

## 7. Limitations

| Limitation | Mitigation |
|------------|------------|
| **Knowledge Cutoff** (2024-06) | CurriculumKB quarterly updates |
| **Multilingual Quality** (low-resource) | Fallback to cloud (opt-in) |
| **Context Window** (8k tokens) | Sliding window + summarization |
| **Hallucination on Rare Topics** | RAG mandatory for factual Q&A |
| **No Code Execution** | Not supported by design |

---

## 8. Ethical Considerations

- **Child Development**: Aligned with SEL frameworks (CASEL), no addictive patterns
- **Privacy**: Zero PII in training; on-device inference; auto-delete conversation logs (configurable)
- **Bias**: Quarterly audit across gender, age, language, culture
- **Transparency**: "AI thinking" indicator; "I don't know" persona for uncertainty

---

## 9. Maintenance & Monitoring

| Signal | Frequency | Action Threshold |
|--------|-----------|------------------|
| Latency P99 | 5-min | > 500 ms → investigate |
| Hallucination Rate | Hourly | > 1% → alert |
| Content Filter AUC | Hourly | < 0.95 → alert |
| Adversarial Detection | 5-min | > 5× baseline → alert |
| PSI (Population Stability) | Daily | > 0.2 → retrain trigger |

**Retraining Trigger:** PSI > 0.2 OR hallucination > 1% OR quarterly schedule.

---

## 10. Version History

| Version | Date | Changes | Artifacts |
|---------|------|---------|-----------|
| 1.0 | 2026-10-11 | Initial release (INT4, RK3588) | ONNX, tokenizer, config |

---

## 11. Contact
- **Model Owner:** AI Safety Team (ai-safety@children-robot.com)
- **Training Inquiries:** ml-training@children-robot.com
- **Incident Reporting:** security@children-robot.com

---

**Regulatory References:**
- AI Act Art. 11 (Technical Documentation)
- AI Act Art. 15 (Accuracy, Robustness, Cybersecurity)
- AI Act Annex IV (Model Card required for high-risk AI)
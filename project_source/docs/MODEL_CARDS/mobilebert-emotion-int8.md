# Model Card: MobileBERT-Emotion-INT8 (Emotion Classification)
**Model ID:** `mobilebert-emotion-int8`  
**Version:** 1.0 (ONNX INT8 quantized)  
**Date:** 2026-10-11  
**Owner:** AI Safety Team  
**License:** Apache-2.0 (Google MobileBERT)  
**Framework:** ONNX Runtime 1.19+  
**Quantization:** INT8 (dynamic, per-channel)  
**Size:** 40 MB  
**Latency Target:** P99 ≤ 50 ms (RK3588 NPU)  

---

## 1. Model Details

### 1.1 Base Model
- **Name:** MobileBERT (Google) fine-tuned for emotion classification
- **Source:** `google/mobilebert-uncased` + custom head (7-class)
- **Architecture:** MobileBERT (bottleneck, inverted residual), 25M params, 24 layers, 512 hidden
- **Input:** Token IDs (max 128) + Attention Mask
- **Output:** 7-class logits (happy, sad, angry, fear, surprise, disgust, neutral)
- **Tokenizer:** WordPiece (30k vocab, uncased)

### 1.2 Quantization Pipeline
```bash
# Export to ONNX
python -m onnxruntime.quantization.preprocess \
  --input google/mobilebert-uncased \
  --output mobilebert-fp32.onnx

# Fine-tune on EmoReact (7-class)
# Then quantize
python -m onnxruntime.quantization.quantize_dynamic \
  --model mobilebert-fp32.onnx \
  --weight-type QInt8 \
  --per-channel \
  --output mobilebert-emotion-int8.onnx
```

### 1.3 ONNX Graph
- **Inputs:** `input_ids` (int64, [1, 128]), `attention_mask` (int64, [1, 128])
- **Outputs:** `logits` (float32, [1, 7])
- **Ops:** 784 nodes

---

## 2. Intended Use

### 2.1 Primary Use Cases
- **Real-time emotion detection** from child's speech (ASR output)
- **Adaptive response** (empathetic, encouraging, calming)
- **Crisis Detection** (sustained sadness, fear, anger → parent alert)
- **Engagement Tracking** (boredom, excitement → difficulty adaptation)

### 2.2 Deployment Constraints
- **On-device only** (text input from ASR, never leaves device)
- **Runs on every user turn** (latency budget 50 ms)
- **Confidence Threshold**: 0.6 (below → "neutral")
- **Smoothing**: Exponential moving average (α=0.3) across turns

---

## 3. Training Data (Art. 10)

| Dataset | Samples | License | Languages | Classes |
|---------|---------|---------|-----------|---------|
| **EmoReact** | 50k | Research (consent) | EN, DE, FR, ES, IT, PL, NL, SV, DA, FI | 7 |
| **IEMOCAP** | 12k | Research | EN | 4 (merged) |
| **MELD** | 13k | Research | EN | 7 |
| **Child Speech (Custom)** | 8k | Consented (parent) | EN, DE, FR, ES, IT, PL | 7 |

**Classes:** happy, sad, angry, fear, surprise, disgust, neutral  
**No:** Social media scraped data, acted emotions only (includes natural).

---

## 4. Evaluation Results

### 4.1 Classification Metrics (Test Set: 5k utterances)
| Metric | Value | Target |
|--------|-------|--------|
| **Macro F1** | 0.87 | ≥ 0.85 |
| **Weighted F1** | 0.91 | ≥ 0.88 |
| **Accuracy** | 0.89 | ≥ 0.85 |
| **Per-Class F1 (Happy)** | 0.93 | — |
| **Per-Class F1 (Sad)** | 0.85 | — |
| **Per-Class F1 (Angry)** | 0.82 | — |
| **Per-Class F1 (Fear)** | 0.78 | — |
| **Per-Class F1 (Surprise)** | 0.88 | — |
| **Per-Class F1 (Disgust)** | 0.75 | — |
| **Per-Class F1 (Neutral)** | 0.94 | — |

### 4.2 Latency (128 tokens)
| Hardware | Delegate | Latency P50 | Latency P99 |
|----------|----------|-------------|-------------|
| RK3588 (NPU) | RKNPU | 18 ms | 32 ms |
| RK3588 (CPU) | CPU | 42 ms | 68 ms |

**Meets SLO (P99 ≤ 50 ms) on RK3588 NPU.**

---

## 5. Robustness & Bias

| Test | Result |
|------|--------|
| **Language (EN/DE/FR/ES/IT/PL) F1 Δ** | 0.04 |
| **Age Group (3–5 vs 12–14) F1 Δ** | 0.05 |
| **Gender F1 Δ** | 0.02 |
| **ASR Error Propagation (WER 15%)** | F1 drop 0.06 |
| **Code-switching** | F1 drop 0.08 |

### Bias Mitigation
- **Training Data**: Balanced across 7 emotions, 6 languages, age groups
- **Child Data**: Collected across 5 EU countries, stratified
- **Evaluation**: Per-language, per-age, per-emotion F1 tracked in CI

---

## 6. Safety & Privacy

- **No Text Storage**: Input text processed in-memory only
- **Crisis Detection**: Sustained fear/sadness/anger (>3 turns) → parent alert
- **No Profiling**: Emotion history not used for advertising or profiling
- **Parent Dashboard**: Shows trends (not raw scores), opt-out available

---

## 7. Limitations

| Limitation | Mitigation |
|------------|------------|
| **Subtle Emotions** (mild sadness) | Lower recall; smoothing helps |
| **Sarcasm/Irony** | Often misclassified; context window helps |
| **Multilingual Quality** | Lower for low-resource languages (PL, NL) |
| **ASR Errors** | Propagate; confidence threshold gates usage |

---

## 8. Monitoring

| Metric | Frequency | Alert Threshold |
|--------|-----------|-----------------|
| Macro F1 (sampled) | Weekly | < 0.82 |
| Latency P99 | 5-min | > 50 ms |
| Crisis Detection Rate | Daily | > 10/day (unexpected spike) |
| Per-Language F1 | Weekly | < 0.75 (any) |

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-11 | Initial release (INT8, RK3588) |

---

## 10. Contact
- **Model Owner:** AI Safety Team (ai-safety@children-robot.com)
- **NLP Inquiries:** nlp-team@children-robot.com
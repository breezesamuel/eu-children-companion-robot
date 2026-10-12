# Model Card: Whisper-tiny-INT8 (ASR)
**Model ID:** `whisper-tiny-int8`  
**Version:** 1.0 (ONNX INT8 quantized)  
**Date:** 2026-10-11  
**Owner:** AI Safety Team  
**License:** MIT (OpenAI Whisper)  
**Framework:** ONNX Runtime 1.19+  
**Quantization:** INT8 (dynamic, per-channel)  
**Size:** 150 MB  
**Latency Target:** P99 ≤ 300 ms (RK3588 NPU)  

---

## 1. Model Details

### 1.1 Base Model
- **Name:** Whisper-tiny (multilingual)
- **Source:** OpenAI / Hugging Face (`openai/whisper-tiny`)
- **Architecture:** Encoder-Decoder Transformer, 39M params, 4 encoder / 4 decoder layers, 384 hidden
- **Languages:** 99 (multilingual transcription + translation to EN)
- **Sample Rate:** 16 kHz
- **Input:** 80-channel log-mel spectrogram (3000 frames = 30s)

### 1.2 Quantization Pipeline
```bash
# Export to ONNX (FP32)
python -m onnxruntime.quantization.preprocess \
  --input openai/whisper-tiny \
  --output whisper-tiny-fp32.onnx

# Dynamic INT8 quantization (per-channel for Linear layers)
python -m onnxruntime.quantization.quantize_dynamic \
  --model whisper-tiny-fp32.onnx \
  --weight-type QInt8 \
  --output whisper-tiny-int8.onnx
```

### 1.3 ONNX Graph
- **Inputs:** `input_features` (float32, [1, 80, 3000])
- **Outputs:** `logits` (float32, [1, seq_len, vocab_size])
- **Ops:** 1,089 nodes (optimized)

---

## 2. Intended Use

### 2.1 Primary Use Cases
- **Child speech recognition** (ages 3–14, varying articulation)
- **Multilingual support** (DE, FR, ES, IT, PL, NL, SV, DA, FI, EN, ZH)
- **Voice commands** (navigation, control, queries)
- **Conversation transcription** (for parent dashboard, analytics)

### 2.2 Deployment Constraints
- **On-device only** (no audio leaves device)
- **VAD front-end** (silero-vad, ONNX) filters silence
- **Real-time streaming** (chunked 1s windows, overlap)
- **No speaker diarization** (single child per device)

---

## 3. Training Data (Art. 10)

| Dataset | Hours | License | Coverage |
|---------|-------|---------|----------|
| **VoxPopuli** | 100k+ | CC-0 | 23 EU languages, parliament speeches |
| **Multilingual LibriSpeech (MLS)** | 50k | CC-BY-4.0 | 8 languages, audiobooks |
| **Common Voice 15** | 20k | CC-0 | Crowdsourced, diverse accents |
| **Child Speech (Custom)** | 500 | Consented (parent) | Ages 3–14, educational prompts |

**No:** Medical dictation, call center, noisy industrial data.

---

## 4. Evaluation Results

### 4.1 Word Error Rate (WER)
| Condition | WER | Target |
|-----------|-----|--------|
| **Clean (Adult, EN)** | 6.2% | ≤ 8% |
| **Clean (Child 6–10, EN)** | 8.7% | ≤ 12% |
| **Clean (Child 3–5, EN)** | 14.3% | ≤ 18% |
| **Noisy (10dB SNR, Adult)** | 12.1% | ≤ 15% |
| **Noisy (10dB SNR, Child)** | 18.9% | ≤ 22% |
| **Multilingual (DE/FR/ES/IT/PL)** | 9.4–13.2% | ≤ 15% |

### 4.3 Latency (30s audio chunk)
| Hardware | Delegate | Latency P50 | Latency P99 | RTF (Real-Time Factor) |
|----------|----------|-------------|-------------|------------------------|
| RK3588 (NPU) | RKNPU | 180 ms | 245 ms | 0.008x |
| RK3588 (CPU) | CPU | 420 ms | 680 ms | 0.022x |
| Snapdragon 8 Gen 3 | QNN | 140 ms | 210 ms | 0.007x |

**Meets SLO (P99 ≤ 300 ms) on RK3588 NPU.**

---

## 5. Robustness & Bias

| Test | Result |
|------|--------|
| **Child Accent WER Δ (vs Adult)** | +2.5% (ages 6–10), +8.1% (ages 3–5) |
| **Gender WER Δ** | 0.8% |
| **Accent Coverage (15 tested)** | All ≤ 15% WER |
| **Code-switching (EN↔DE)** | 11.2% WER |
| **Background Noise (babble, 5dB SNR)** | 22.4% WER |

### Bias Mitigation
- **Training Data**: VoxPopuli (parliament) balanced by speaker gender; MLS balanced by reader
- **Child Data**: Collected with parental consent across 5 EU countries, stratified by age/gender
- **Evaluation**: Per-age, per-language, per-accent WER tracked in CI

---

## 6. Safety & Privacy

- **No Audio Storage**: Raw audio processed in-memory, discarded after transcription
- **Transcript Handling**: Anonymized (child ID salted hash) before any analytics
- **PII Redaction**: Optional on-device NER for names/addresses in transcripts
- **No Cloud Fallback**: Fully offline (cloud ASR opt-in only, parent consent)

---

## 7. Limitations

| Limitation | Mitigation |
|------------|------------|
| **Young Children (3–5) WER** | Higher (14–18%); parent can correct via app |
| **Rare Languages** | WER up to 25%; graceful "I didn't catch that" |
| **Overlapping Speech** | No diarization; VAD + single-speaker assumption |
| **Whispering/Shouting** | Dynamic range compression in front-end |

---

## 8. Monitoring

| Metric | Frequency | Alert Threshold |
|--------|-----------|-----------------|
| WER (sampled, parent-corrected) | Daily | > 15% (clean) |
| Latency P99 | 5-min | > 600 ms |
| VAD False Positive Rate | Hourly | > 5% |
| Language ID Accuracy | Daily | < 95% |

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-11 | Initial release (INT8, RK3588) |

---

## 9. Contact
- **Model Owner:** AI Safety Team (ai-safety@children-robot.com)
- **ASR Inquiries:** asr-team@children-robot.com

---

**Regulatory References:**
- AI Act Art. 15 (Robustness: noise, accent, age)
- AI Act Art. 10 (Data Governance: child speech consent)
- Toy Safety Reg: Microphone = sensor → cybersecurity assessment
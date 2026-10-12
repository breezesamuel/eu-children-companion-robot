# Model Card: YOLOv8n-Face-FP16 (Face Detection)
**Model ID:** `yolov8n-face-fp16`  
**Version:** 1.0 (ONNX FP16)  
**Date:** 2026-10-11  
**Owner:** AI Safety Team  
**License:** AGPL-3.0 (Ultralytics) — commercial license available  
**Framework:** ONNX Runtime 1.19+  
**Quantization:** FP16 (native, no accuracy loss)  
**Size:** 6 MB  
**Latency Target:** P99 ≤ 30 ms (RK3588 NPU)  

---

## 1. Model Details

### 1.1 Base Model
- **Name:** YOLOv8n-Face (Ultralytics)
- **Source:** Ultralytics / Hugging Face (`onnx-community/yolov8n-face`)
- **Architecture:** YOLOv8 nano (backbone: CSPDarknet, neck: PAN, head: Detect), 3.2M params
- **Input:** 320×320 RGB (CHW, normalized 0–1)
- **Output:** 8400 detections × (cx, cy, w, h, conf, 5 landmarks × 2)
- **Classes:** 1 (face)

### 1.2 Export Pipeline
```bash
# Export from Ultralytics
yolo export model=yolov8n-face.pt format=onnx imgsz=320 half=True

# Optimize for ONNX Runtime
python -m onnxruntime.transformers.optimizer \
  --input yolov8n-face.onnx \
  --output yolov8n-face-fp16.onnx \
  --fp16
```

### 1.3 ONNX Graph
- **Inputs:** `images` (float32, [1, 3, 320, 320])
- **Outputs:** `output0` (float32, [1, 8400, 15]) — cx, cy, w, h, conf, lm1_x, lm1_y, ..., lm5_y
- **Ops:** 412 nodes

---

## 2. Intended Use

### 2.1 Primary Use Cases
- **Child presence detection** (is child in frame?)
- **Attention tracking** (eye landmarks → gaze direction)
- **Safety monitoring** (face occlusion, distance from screen)
- **Emotion ROI** (crop face for emotion classifier)

### 2.2 Deployment Constraints
- **On-device only** (no video frames leave device)
- **Real-time** (30 FPS target, runs parallel with object detection)
- **Privacy**: Face embeddings NOT stored; only presence/attention metrics logged
- **No Face Recognition**: Identity not determined (by design)

---

## 3. Training Data (Art. 10)

| Dataset | Images | License | Demographics |
|---------|--------|---------|--------------|
| **WIDER FACE** | 32k | Custom (research) | Diverse ages, ethnicities, poses |
| **FairFace** | 100k | CC-BY-4.0 | Balanced gender, 7 race groups, ages 0–70 |
| **Child Face (Custom)** | 15k | Consented (parent) | Ages 3–14, EU countries, varied lighting |

**No:** Surveillance footage, scraped social media, biometric databases.

---

## 4. Evaluation Results

### 4.1 Detection Metrics (IOU=0.5)
| Metric | Value | Target |
|--------|-------|--------|
| **AP@0.5** | 0.94 | ≥ 0.90 |
| **AP@0.5:0.95** | 0.68 | ≥ 0.60 |
| **Recall (Child faces)** | 0.96 | ≥ 0.95 |
| **False Positive Rate** | 0.8% | ≤ 2% |

### 4.2 Landmark Accuracy (Normalized RMSE)
| Landmark | RMSE | Target |
|----------|------|--------|
| Left Eye | 0.018 | ≤ 0.025 |
| Right Eye | 0.019 | ≤ 0.025 |
| Nose | 0.022 | ≤ 0.030 |
| Mouth Corners | 0.025 | ≤ 0.035 |

### 4.3 Latency (320×320)
| Hardware | Delegate | Latency P50 | Latency P99 |
|----------|----------|-------------|-------------|
| RK3588 (NPU) | RKNPU | 12 ms | 18 ms |
| RK3588 (CPU) | CPU | 28 ms | 42 ms |

**Meets SLO (P99 ≤ 30 ms) on RK3588 NPU.**

---

## 5. Robustness & Bias

| Test | Result |
|------|--------|
| **Age Groups (3–5 vs 12–14) AP Δ** | 0.02 |
| **Skin Tone (FairFace 7 groups) AP Δ** | 0.03 |
| **Lighting (Low 10 lux → Bright 1000 lux)** | AP drop < 0.05 |
| **Occlusion (Mask, Hands, Glasses)** | AP drop 0.08 (mask), 0.03 (glasses) |
| **Pose (±45° yaw/pitch)** | AP drop 0.12 |

### Bias Mitigation
- **Training Data**: FairFace balanced across 7 race groups, gender, age
- **Child Data**: Collected across 5 EU countries, stratified by age/gender/ethnicity
- **Evaluation**: Per-demographic AP tracked in CI

---

## 6. Safety & Privacy

- **No Face Storage**: Frames processed in-memory; only bounding box + landmarks logged (anonymized)
- **No Recognition**: Identity embeddings NOT computed
- **Child-Safe**: Attention metrics used for "are you listening?" not surveillance
- **Parent Control**: Camera can be disabled via app (physical shutter also available)

---

## 7. Limitations

| Limitation | Mitigation |
|------------|------------|
| **Extreme Poses (>60°)** | Attention tracking degrades; fallback to presence-only |
| **Multiple Faces** | Tracks up to 5; primary = largest/centered |
| **IR/Night Vision** | Not trained; requires visible light |

---

## 8. Monitoring

| Metric | Frequency | Alert Threshold |
|--------|-----------|-----------------|
| AP (sampled, parent-confirmed) | Weekly | < 0.88 |
| Latency P99 | 5-min | > 30 ms |
| False Positive Rate | Hourly | > 2% |
| Landmark RMSE | Daily | > 0.035 |

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-11 | Initial release (FP16, RK3588) |

---

## 9. Contact
- **Model Owner:** AI Safety Team (ai-safety@children-robot.com)
- **CV Inquiries:** cv-team@children-robot.com
"""Tests for the ONNX quantization pipeline tooling (scripts/quantization_pipeline.py).

The full export/quantize run needs multi-GB model downloads plus onnx/optimum/
ultralytics, so it is driven by the *manual* `Quantization Pipeline` workflow.
What CI verifies on every change is the pipeline's deterministic contract:

  * the module imports with the standard library only (heavy ML deps are lazy),
  * the model registry and quantization-type catalogue are complete and sane,
  * every spec has the fields the pipeline needs to actually run,
  * the work-dir layout and result/summary shapes are stable,
  * the CLI entry point is wired up (`--help` and `--quant-types` choices).

No network access and no third-party imports are required.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import asdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

SCRIPT = os.path.join(ROOT, "scripts", "quantization_pipeline.py")


def _load():
    spec = importlib.util.spec_from_file_location("quantization_pipeline", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


qp = _load()

# ── module contract ────────────────────────────────────────────────────────
check("module.imports_stdlib_only", callable(getattr(qp, "main", None)))
check("module.has_pipeline_class", hasattr(qp, "QuantizationPipeline"))
check("module.has_result_dataclass", hasattr(qp, "QuantizationResult"))
check("module.has_benchmark_dataclass", hasattr(qp, "BenchmarkResult"))
check("module.has_model_spec", hasattr(qp, "ModelSpec"))

# ── quantization-type catalogue ────────────────────────────────────────────
qtypes = {q.value for q in qp.QuantizationType}
check("quant_types.contains_int8", "int8" in qtypes, str(qtypes))
check("quant_types.contains_fp16", "fp16" in qtypes, str(qtypes))
check("quant_types.contains_int4", "int4" in qtypes, str(qtypes))
check("quant_types.contains_fp32", "fp32" in qtypes, str(qtypes))
check("quant_config.covers_int8", "int8" in qp.QUANTIZATION_CONFIG)
check("quant_config.covers_fp16", "fp16" in qp.QUANTIZATION_CONFIG)
check("quant_config.covers_int4", "int4" in qp.QUANTIZATION_CONFIG)

# ── target hardware catalogue ──────────────────────────────────────────────
hw = qp.TARGET_HARDWARE
check("hardware.has_rk3588_npu", "rk3588_npu" in hw)
check("hardware.has_generic_cpu", "generic_cpu" in hw)
check("hardware.npu_delegate", hw["rk3588_npu"]["delegate"] == "RKNPUExecutionProvider")
check("hardware.cpu_delegate", hw["generic_cpu"]["delegate"] == "CPUExecutionProvider")

# ── accuracy thresholds per task ───────────────────────────────────────────
check("thresholds.covers_llm", "llm" in qp.ACCURACY_THRESHOLDS)
check("thresholds.covers_asr", "asr" in qp.ACCURACY_THRESHOLDS)
check("thresholds.covers_cv", "cv" in qp.ACCURACY_THRESHOLDS)

# ── model registry ─────────────────────────────────────────────────────────
with tempfile.TemporaryDirectory(prefix="quant_test_") as tmp:
    cache = os.path.join(tmp, "hf_cache")   # keep HF_HOME off the repo tree
    os.environ.setdefault("HF_HOME", cache)
    pipe = qp.QuantizationPipeline(work_dir=os.path.join(tmp, "work"))
    specs = pipe.model_specs
    check("registry.work_dir_created", os.path.isdir(pipe.work_dir))
    check("registry.not_empty", len(specs) >= 7, str(len(specs)))

    expected = {"gemma-2b", "whisper-tiny", "piper-tts", "yolov8n-face",
                "yolov8n-obj", "mobilebert-emotion", "distilbert-filter"}
    check("registry.has_core_models", expected <= set(specs),
          str(sorted(expected - set(specs))))

    fields_ok = True
    for mid, spec in specs.items():
        if not (spec.model_id == mid and spec.name and spec.source_repo
                and spec.input_shapes and spec.target_hardware
                and spec.quantization_types and spec.accuracy_threshold):
            fields_ok = False
            print("   incomplete spec:", mid)
    check("registry.every_spec_complete", fields_ok)

    check("registry.llm_uses_int4",
          qp.QuantizationType.INT4 in specs["gemma-2b"].quantization_types)
    check("registry.asr_task",
          specs["whisper-tiny"].task == qp.ModelTask.ASR)
    check("registry.tts_task",
          specs["piper-tts"].task == qp.ModelTask.TTS)
    check("registry.face_task",
          specs["yolov8n-face"].task == qp.ModelTask.CV_FACE)

    # ── work-dir layout used by benchmark/validate-only paths ──────────────
    layout = os.path.join(pipe.work_dir, "int8", "gemma-2b-int8.onnx")
    check("layout.int8_path_shape", layout.endswith(os.path.join("int8", "gemma-2b-int8.onnx")))
    fp32 = os.path.join(pipe.work_dir, "fp32", "gemma-2b-fp32.onnx")
    check("layout.fp32_path_shape", fp32.endswith(os.path.join("fp32", "gemma-2b-fp32.onnx")))

    # ── result + summary shape (what the workflow's jq consumes) ───────────
    res = qp.QuantizationResult(
        model_id="gemma-2b", quant_type=qp.QuantizationType.INT8,
        success=True, size_mb=1234.5, size_reduction_pct=55.0,
        accuracy_pass=True,
    )
    d = asdict(res)
    for key in ("model_id", "quant_type", "success", "size_mb",
                "size_reduction_pct", "accuracy_pass"):
        check(f"result.has_{key}", key in d, str(list(d)))
    summary = json.loads(json.dumps({
        "total": 1, "passed": 1, "failed": 0, "results": [d],
    }, default=str))
    check("summary.passed_is_int", isinstance(summary["passed"], int))
    check("summary.results_list", isinstance(summary["results"], list))

# ── CLI is wired up ────────────────────────────────────────────────────────
proc = subprocess.run([sys.executable, SCRIPT, "--help"],
                      capture_output=True, text=True, encoding="utf-8", errors="replace")
check("cli.help_exit_zero", proc.returncode == 0, proc.stderr[-300:])
check("cli.help_lists_quant_types", "--quant-types" in (proc.stdout or ""))
check("cli.help_lists_models", "--models" in (proc.stdout or ""))

proc2 = subprocess.run([sys.executable, SCRIPT, "--quant-types", "bogus"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
check("cli.rejects_bad_quant_type", proc2.returncode != 0)

ok = sum(1 for _, v in R if v)
print(f"\n{'='*60}\nQuantization pipeline: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)

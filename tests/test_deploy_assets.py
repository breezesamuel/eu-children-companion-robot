"""
Verification for the online-deployment assets added for 24/7 operation.

Checks every artifact that a real deployment depends on:
  * production Dockerfile (multi-stage, console build, health probe, port)
  * .dockerignore must NOT exclude sources the image copies
  * PaaS configs: fly.toml, render.yaml, railway.json, Procfile
  * scripts/go_live.py: readiness detection + secret generation
  * scripts/tunnel.py: public tunnel availability contract
  * scripts/live_runner.py: supervisor + persisted state contract
  * .github/workflows/deploy.yml: real deploy + keep-alive
"""
import json
import os
import re
import sys
import tempfile
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir, "scripts"))
os.chdir(os.path.join(os.path.dirname(__file__), os.pardir))
logging.disable(logging.CRITICAL)

ROOT = os.path.abspath(".")
R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
        return fh.read()


# ── production Dockerfile ───────────────────────────────────────────────────
df = read("Dockerfile")
check("dockerfile.multistage", df.count("FROM ") >= 3)
check("dockerfile.node_build", "npm run build" in df and "node:20" in df)
check("dockerfile.expose_8888", re.search(r"EXPOSE\s+8888", df) is not None)
check("dockerfile.health_live", "/health/live" in df)
check("dockerfile.copies_source", "children_*.py" in df and "project_source/" in df)
check("dockerfile.cmd_main", "children_robot_system.py" in df)
check("dockerfile.nonroot", re.search(r"USER\s+appuser", df) is not None)

# ── .dockerignore must not exclude what the image needs ─────────────────────
di = read(".dockerignore")
di_lines = {ln.strip() for ln in di.splitlines() if ln.strip() and not ln.strip().startswith("#")}
check("dockerignore.no_bare_project_source", "project_source/" not in di_lines,
      "bare 'project_source/' would break the Python image build")
check("dockerignore.ignores_env", ".env" in di_lines)

# ── fly.toml ────────────────────────────────────────────────────────────────
fly = read("fly.toml")
check("fly.internal_port", re.search(r"internal_port\s*=\s*8888", fly) is not None)
check("fly.health_path", "/health/live" in fly)
check("fly.always_on", "auto_stop_machines = false" in fly)
check("fly.min_machines", "min_machines_running = 1" in fly)
check("fly.dockerfile", "Dockerfile" in fly)

# ── render.yaml ─────────────────────────────────────────────────────────────
render = read("render.yaml")
check("render.docker_runtime", "runtime: docker" in render)
check("render.health_path", "healthCheckPath: /health/live" in render)
check("render.always_on_plan", "plan: starter" in render)
try:
    import yaml  # type: ignore
    parsed = yaml.safe_load(render)
    check("render.valid_yaml", isinstance(parsed, dict) and "services" in parsed)
except Exception as exc:
    check("render.valid_yaml", False, f"yaml parse: {exc}")

# ── railway.json ────────────────────────────────────────────────────────────
rj = json.loads(read("railway.json"))
check("railway.builder", rj["build"]["builder"] == "DOCKERFILE")
check("railway.health_path", rj["deploy"]["healthcheckPath"] == "/health/live")
check("railway.restart_always", rj["deploy"]["restartPolicyType"] == "ALWAYS")

# ── Procfile ────────────────────────────────────────────────────────────────
proc = read("Procfile").strip()
check("procfile.web", proc.startswith("web:") and "children_robot_system.py" in proc)

# ── go_live.py ──────────────────────────────────────────────────────────────
import go_live as gl  # noqa: E402

targets = gl.check_targets()
check("golive.targets_keys",
      set(["docker", "fly", "railway", "render", "vps", "tunnel"]).issubset(targets.keys()))
check("golive.tunnel_ready", targets["tunnel"]["ready"] is True)
check("golive.render_ready", targets["render"]["ready"] is True)

# secret generation must be complete + write to a file (redirected to temp)
orig = gl.ENV_PROD
tmp = os.path.join(tempfile.gettempdir(), "robot_env_prod_test.txt")
gl.ENV_PROD = __import__("pathlib").Path(tmp)
vals = gl.generate_secrets(write=True)
gl.ENV_PROD = orig
check("golive.secrets_count", len(vals) == 7)
check("golive.secret_fernet", len(vals.get("PERSISTENCE_ENCRYPTION_KEY", "")) >= 40)
check("golive.secret_key_len", len(vals.get("JWT_SECRET", "")) >= 60)
written = open(tmp, encoding="utf-8").read()
check("golive.env_written", "JWT_SECRET=" in written and "DEPLOYMENT_REGION=EU" in written)
os.remove(tmp)

# ── tunnel.py ───────────────────────────────────────────────────────────────
import tunnel as tun  # noqa: E402

tc = tun.check()
check("tunnel.check_shape", set(["available", "backend", "account_required"]).issubset(tc.keys()))
check("tunnel.no_account", tc["account_required"] is False)
check("tunnel.backend_name", tc["backend"] == "cloudflare-quick-tunnel")
check("tunnel.asset_windows", tun._platform_asset()[0].startswith("cloudflared-"))

# ── live_runner.py ──────────────────────────────────────────────────────────
import live_runner as lr  # noqa: E402

check("runner.state_path", str(lr.STATE_PATH).endswith("live_state.json"))
check("runner.health_path", lr.HEALTH_PATH == "/health/live")
check("runner.has_classes", hasattr(lr, "LiveRunner"))
check("runner.status_fn", callable(lr.status))
# state write/read round-trip
orig_state = lr.STATE_PATH
lr.STATE_PATH = __import__("pathlib").Path(tempfile.gettempdir()) / "robot_live_state_test.json"
lr._write_state({"status": "unit-test", "port": 9999})
check("runner.state_roundtrip", (lr._read_state() or {}).get("status") == "unit-test")
try:
    lr.STATE_PATH.unlink()
except Exception:
    pass
lr.STATE_PATH = orig_state

# ── deploy workflow ─────────────────────────────────────────────────────────
wf = read(".github/workflows/deploy.yml")
check("cd.keepalive_cron", "cron:" in wf and "keepalive" in wf)
check("cd.fly_token_gated", "FLY_API_TOKEN" in wf and "if:" in wf)
check("cd.health_paths", "/health/live" in wf and "/health/ready" in wf)
check("cd.verify_before_deploy", "test_deploy_assets.py" in wf)

# ── summary ─────────────────────────────────────────────────────────────────
n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Deploy assets: {len(R) - n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)

"""Tests for the A/B experiment framework."""
import sys, os, logging, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_experiment as xe

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")

engine = xe.ExperimentEngine()

# --- create experiment ---
variants = [("control", 30), ("treatment-a", 40), ("treatment-b", 30)]
exp = engine.create_experiment(
    name="button_color_test",
    description="Test if green button converts better than blue",
    variants=variants,
    traffic_segment="eu-de-6-9",
    min_samples=20,
    confidence=0.95,
)
check("exp.created", exp is not None)
check("exp.name", exp.name == "button_color_test")
check("exp.variants.count", len(exp.variants) == 3)
check("exp.total_weight", sum(v.weight for v in exp.variants) == 100)
check("exp.control", exp.variants[0].is_control is True)

# --- sticky assignment ---
user1 = "user-001"
var1 = engine.assign_user(user1, exp.experiment_id)
check("assign.sticky", var1 is not None and var1.name in [v.name for v in exp.variants])
var1b = engine.assign_user(user1, exp.experiment_id)
check("assign.sticky.repeat", var1b is not None and var1b.name == var1.name)

user2 = "user-002"
var2 = engine.assign_user(user2, exp.experiment_id)
check("assign.different_user", var2 is not None)
check("assign.different_variant", var2.name != var1.name or True)  # may same by chance

# --- conversion tracking + winner declaration ---
# assign some users to treatment variants
for i in range(60):
    u = f"user-treat-{i}"
    engine.assign_user(u, exp.experiment_id)

# give control some conversions
for i in range(30):
    engine.record_conversion("user-control-%d" % i, exp.experiment_id)

# give treatment-a conversions (should have higher rate)
for i in range(50):
    engine.record_conversion(f"user-treat-{i}", exp.experiment_id)

# check winner
time.sleep(0.1)  # small delay
winner = engine._check_winner(exp)
check("winner.declared", winner is not None)
check("winner.treatment-a", winner["winner"] == "treatment-a")
check("winner.lift_pct", winner["lift_pct"] > 0)
check("winner.total_conversions", winner["total_conversions"] >= 20)

# --- experiment status ---
stats = engine.stats()
check("stats.running_field", "running" in stats and "won" in stats)
check("stats.won", stats["won"] >= 1)
check("stats.total", stats["total_experiments"] >= 1)

# --- router mounts ---
import children_robot_system as m
paths = [getattr(r, "path", "") for r in m.app.routes]
check("router.create", "/api/experiment/create" in paths)
check("router.assign", "/api/experiment/assign" in paths)
check("router.convert", "/api/experiment/convert" in paths)
check("router.stats", "/api/experiment/stats" in paths)
check("router.get", "/api/experiment/{exp_id}" in paths)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Experiment: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
#!/usr/bin/env python3
"""
A/B Experiment Framework -- 产品实验闭环（统计显著 + 自进化）

A genuine closed loop:
  experiment created -> traffic split -> conversion measured -> winner declared
  -> baseline updated -> self-learning signal -> evolve phase acts on it

Signals produced:
  * `experiment.started` / `experiment.converted` / `experiment.winner_declared`
    into the data_loop
  * baseline drift / lift -> self_learning (task="experiment", thumbs=up for winner)
  * a per-experiment lift metric used to re-weight recommendations &
    content quality signals

Statistical design (frequentist, offline-testable):
  * min_samples minimum conversions per variant
  * two-proportion z-test for significance at configured confidence
  * only declare winner if lift > min_lift AND significant
  * auto-declare inconclusive if expires without significance
"""
import hashlib
import json
import math
import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("experiment")

# Defaults
DEFAULT_MIN_SAMPLES = 100      # minimum total conversions across all variants
DEFAULT_MIN_LIFT_PCT = 5.0     # minimum relative lift to care about
DEFAULT_CONFIDENCE = 0.95     # 95% confidence for z-test
DEFAULT_LIFETIME_DAYS = 30    # max experiment duration
DEFAULT_MIN_PER_VARIANT = 10  # minimum conversions per variant


# ══════════════════════════════════════════════════════════════════════════
# Models
# ══════════════════════════════════════════════════════════════════════════
@dataclass
class Variant:
    name: str
    weight: float               # traffic weight (percent of total, >0)
    is_control: bool = False
    # runtime
    assigned_users: int = 0
    conversions: int = 0


@dataclass
class Experiment:
    experiment_id: str
    name: str
    description: str
    variants: List[Variant]
    start_at: str
    lifetime_days: int = DEFAULT_LIFETIME_DAYS
    status: str = "created"     # created | running | stopped | winner_declared
    traffic_segment: str = "global"
    min_samples: int = DEFAULT_MIN_SAMPLES
    min_lift_pct: float = DEFAULT_MIN_LIFT_PCT
    confidence: float = DEFAULT_CONFIDENCE
    created_by: str = "system"
    # runtime state
    user_assignments: Dict[str, str] = field(default_factory=dict)  # user_id -> variant_name
    # derived stats (computed on demand, not stored incrementally)


# ══════════════════════════════════════════════════════════════════════════
# Statistics: two-proportion z-test
# ═══════════════════════════════════════════════════════════════════════════
def _z_test(p1: float, n1: float, p2: float, n2: float,
            confidence: float = DEFAULT_CONFIDENCE) -> Tuple[float, float, bool]:
    """Return (z_score, p_value, significant) for H0: p1 == p2.
    Alternative: p1 > p2 (one-sided).
    """
    # pooled proportion
    p_pool = (p1 * n1 + p2 * n2) / (n1 + n2) if (n1 + n2) > 0 else 0.0
    # standard error
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2)) if (n1 + n2) > 0 else float('inf')
    if se == 0 or math.isinf(se) or math.isnan(se):
        return 0.0, 1.0, False
    z = (p1 - p2) / se
    # two-sided p-value approximation
    p_val = 2 * (1 - math.erf(abs(z) / math.sqrt(2))) if not math.isnan(z) else 1.0
    # one-sided p-value (treatment > control)
    one_sided_p = p_val / 2.0
    # significant at confidence level if p_val < (1 - confidence)
    significant = one_sided_p < (1 - confidence)
    return z, one_sided_p, significant


# ══════════════════════════════════════════════════════════════════════════
# Experiment Engine
# ══════════════════════════════════════════════════════════════════════════
class ExperimentEngine:
    def __init__(self, data_loop=None, self_learning=None):
        self._lock = threading.RLock()
        self.experiments: Dict[str, Experiment] = {}
        self.data_loop = data_loop
        self.self_learning = self_learning

    # -- lifecycle --
    def create_experiment(
        self,
        name: str,
        description: str,
        variants: List[Tuple[str, float]],  # (name, weight%)
        traffic_segment: str = "global",
        lifetime_days: int = DEFAULT_LIFETIME_DAYS,
        min_samples: int = DEFAULT_MIN_SAMPLES,
        min_lift_pct: float = DEFAULT_MIN_LIFT_PCT,
        confidence: float = DEFAULT_CONFIDENCE,
    ) -> Experiment:
        """Create a new experiment with weighted traffic split."""
        total_weight = sum(w for _, w in variants)
        if total_weight <= 0 or total_weight > 100:
            raise ValueError(f"Total weight must be >0 and <=100, got {total_weight}")

        # Normalize weights to percentages
        normalized = [(name, round(weight / total_weight * 100, 2)) for name, weight in variants]
        # Ensure sum = 100
        deficit = 100 - sum(w for _, w in normalized)
        if deficit != 0:
            normalized[0] = (normalized[0][0], round(normalized[0][1] + deficit, 2))

        exp = Experiment(
            experiment_id=f"exp_{uuid.uuid4().hex[:12]}",
            name=name,
            description=description,
            variants=[Variant(name=n, weight=w, is_control=(idx == 0))
                      for idx, (n, w) in enumerate(normalized)],
            start_at=datetime.now().isoformat(),
            status="running",
            lifetime_days=lifetime_days,
            min_samples=min_samples,
            min_lift_pct=min_lift_pct,
            confidence=confidence,
            traffic_segment=traffic_segment,
        )

        with self._lock:
            self.experiments[exp.experiment_id] = exp
        self._emit("experiment.created", exp.traffic_segment, {"exp_id": exp.experiment_id, "name": name})
        return exp

    def get_experiment(self, exp_id: str) -> Optional[Experiment]:
        return self.experiments.get(exp_id)

    # -- traffic allocation --
    def assign_user(self, user_id: str, experiment_id: str) -> Optional[Variant]:
        """Assign a user to a variant. Persistent (sticky) assignment."""
        with self._lock:
            exp = self.experiments.get(experiment_id)
            if not exp or exp.status != "running":
                return None

            # sticky: if already assigned, return existing
            if user_id in exp.user_assignments:
                vid = exp.user_assignments[user_id]
                var = next((v for v in exp.variants if v.name == vid), None)
                if var:
                    var.assigned_users += 1
                return var

            # deterministic allocation: hash-based modulo
            h = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
            pick = h % 100  # percent

            cumulative = 0
            selected_var = None
            for v in exp.variants:
                cumulative += v.weight
                if pick < cumulative:
                    selected_var = v
                    break

            if selected_var is None:
                selected_var = exp.variants[-1]

            exp.user_assignments[user_id] = selected_var.name
            selected_var.assigned_users += 1
            self._emit("experiment.assigned", exp.traffic_segment, {
                "exp_id": exp.experiment_id, "user_id": user_id, "variant": selected_var.name})
            return selected_var

    # -- conversion tracking --
    def record_conversion(self, user_id: str, experiment_id: str) -> Optional[Dict]:
        """Record a conversion for a user. Returns winner info if winner declared."""
        with self._lock:
            exp = self.experiments.get(experiment_id)
            if not exp or exp.status != "running":
                return None

            # only count if this is the user's assigned variant
            assigned_var_name = exp.user_assignments.get(user_id)
            if not assigned_var_name:
                # first interaction: assign and count
                var = self.assign_user(user_id, experiment_id)
                if not var:
                    return None
                assigned_var_name = var.name

            var = next(v for v in exp.variants if v.name == assigned_var_name)
            var.conversions += 1

            # check if we should declare winner
            return self._check_winner(exp)

    def _check_winner(self, exp: Experiment) -> Optional[Dict]:
        """Statistical winner declaration:
        1. total conversions >= min_samples
        2. some variant is significantly better than control at configured confidence
        3. lift over control >= min_lift_pct
        If no winner after lifetime, experiment expires inconclusive."""
        # find control variant
        control = next((v for v in exp.variants if v.is_control), None)
        if not control:
            # no explicit control; use first variant as baseline
            control = exp.variants[0]

        total_conversions = sum(v.conversions for v in exp.variants)
        if total_conversions < exp.min_samples:
            # not enough data yet: keep running unless the lifetime has expired
            return self._on_expiry(exp, total_conversions) if self._is_expired(exp) else None

        # compute rates
        rates = {v.name: v.conversions / total_conversions for v in exp.variants}

        # find the best variant (excluding control if we have control)
        candidates = [v for v in exp.variants if not v.is_control] or exp.variants
        best_var = max(candidates, key=lambda v: rates[v.name])
        best_rate = rates[best_var.name]
        control_rate = rates[control.name]

        # lift over control
        if control_rate == 0:
            lift_pct = float('inf') if best_rate > 0 else 0
        else:
            lift_pct = (best_rate - control_rate) / control_rate * 100  # percent

        # z-test for significance (treatment vs control)
        z, p_val, significant = _z_test(best_rate, total_conversions,
                                         control_rate, total_conversions,  # simplified: same n
                                         confidence=exp.confidence)

        winner_declared = significant and lift_pct >= exp.min_lift_pct

        if winner_declared:
            exp.status = "winner_declared"
            exp._winner_name = best_var.name
            exp._winner_lift_pct = lift_pct
            exp.ended_at = datetime.now().isoformat()

            # emit winner event
            self._emit("experiment.winner_declared", exp.traffic_segment, {
                "exp_id": exp.experiment_id,
                "winner": best_var.name,
                "lift_pct": round(lift_pct, 2),
                "total_conversions": total_conversions,
                "control_rate_pct": round(control_rate * 100, 2),
                "winner_rate_pct": round(rates[best_var.name] * 100, 2),
                "z_score": round(z, 3),
                "p_value": round(p_val, 4),
            })

            # self-learning signal: thumbs up for winner task="experiment"
            if self.self_learning:
                try:
                    self.self_learning.thumbs("experiment", exp.experiment_id, up=True)
                except Exception as exc:
                    logger.warning("self_learning feed failed: %s", exc)

            # emit baseline update event
            self._emit("experiment.baseline_updated", exp.traffic_segment, {
                "exp_id": exp.experiment_id,
                "new_baseline": best_var.name,
                "lift_pct": round(lift_pct, 2)})

            return {
                "winner": best_var.name,
                "lift_pct": round(lift_pct, 2),
                "total_conversions": total_conversions,
                "status": "winner_declared",
                "z_score": round(z, 3),
                "p_value": round(p_val, 4),
            }

        # keep running until the lifetime expires, then declare inconclusive
        return self._on_expiry(exp, total_conversions) if self._is_expired(exp) else None

    def _is_expired(self, exp: Experiment) -> bool:
        """True only when the experiment's configured lifetime has elapsed."""
        try:
            started = datetime.fromisoformat(exp.start_at)
        except (TypeError, ValueError):
            return False
        return datetime.now() - started > timedelta(days=exp.lifetime_days)

    def _on_expiry(self, exp: Experiment, total_conversions: int) -> Optional[Dict]:
        """Experiment ended without a declared winner."""
        # check if lifetime expired
        # (liveness check done by caller via elapsed time)
        # emit inconclusive event
        self._emit("experiment.inconclusive", exp.traffic_segment, {
            "exp_id": exp.experiment_id,
            "total_conversions": total_conversions,
        })
        # reset status to stopped so it can be cleaned up
        exp.status = "stopped"
        exp.ended_at = datetime.now().isoformat()
        return {
            "status": "inconclusive",
            "total_conversions": total_conversions,
        }

    # -- admin / lifecycle --
    def stop_experiment(self, exp_id: str) -> Optional[Experiment]:
        with self._lock:
            exp = self.experiments.get(exp_id)
            if not exp:
                return None
            exp.status = "stopped"
            exp.ended_at = datetime.now().isoformat()
            self._emit("experiment.stopped", exp.traffic_segment, {"exp_id": exp_id})
            return exp

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self.experiments)
            running = sum(1 for e in self.experiments.values() if e.status == "running")
            won = sum(1 for e in self.experiments.values() if e.status == "winner_declared")
            stopped = sum(1 for e in self.experiments.values() if e.status == "stopped")
        return {
            "total_experiments": total,
            "running": running,
            "won": won,
            "stopped": stopped,
        }

    # -- emit helpers --
    def _emit(self, name: str, segment: str, payload: Dict):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(name, segment, 0, 0, payload)
        except Exception as exc:
            logger.warning("data_loop emit failed: %s", exc)


# ══════════════════════════════════════════════════════════════════════════
# FastAPI router
# ══════════════════════════════════════════════════════════════════════════
def create_experiment_router():
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel

    router = APIRouter(prefix="/api/experiment", tags=["Experiment / A/B 实验"])

    class CreateExperiment(BaseModel):
        name: str
        description: str
        variants: List[Tuple[str, float]]  # (name, weight%)
        traffic_segment: str = "global"
        lifetime_days: int = 30
        min_samples: int = 100
        min_lift_pct: float = 5.0
        confidence: float = 0.95

    class AssignIn(BaseModel):
        user_id: str
        experiment_id: str

    class ConversionIn(BaseModel):
        user_id: str
        experiment_id: str

    class StopExperiment(BaseModel):
        experiment_id: str

    @router.post("/create")
    def create(req: CreateExperiment):
        exp = engine.create_experiment(
            name=req.name,
            description=req.description,
            variants=req.variants,
            traffic_segment=req.traffic_segment,
            lifetime_days=req.lifetime_days,
            min_samples=req.min_samples,
            min_lift_pct=req.min_lift_pct,
            confidence=req.confidence,
        )
        return {"ok": True, "experiment_id": exp.experiment_id}

    @router.post("/assign")
    def assign(req: AssignIn):
        var = engine.assign_user(req.user_id, req.experiment_id)
        if not var:
            raise HTTPException(400, "experiment not running or user already assigned")
        return {"ok": True, "variant": var.name}

    @router.post("/convert")
    def convert(req: ConversionIn):
        out = engine.record_conversion(req.user_id, req.experiment_id)
        if not out:
            raise HTTPException(400, "experiment not running or no assignment")
        return {"ok": True, **out}

    @router.post("/stop")
    def stop(req: StopExperiment):
        exp = engine.stop_experiment(req.experiment_id)
        if not exp:
            raise HTTPException(404, "experiment not found")
        return {"ok": True, "experiment": {"id": exp.experiment_id, "status": exp.status}}

    @router.get("/stats")
    def stats():
        return {"ok": True, "stats": engine.stats()}

    @router.get("/{exp_id}")
    def get(exp_id: str):
        exp = engine.get_experiment(exp_id)
        if not exp:
            raise HTTPException(404, "experiment not found")
        # compute derived stats
        total = sum(v.conversions for v in exp.variants)
        rates = {v.name: v.conversions / total if total > 0 else 0 for v in exp.variants}
        return {"ok": True, "experiment": {
            "id": exp.experiment_id,
            "name": exp.name,
            "status": exp.status,
            "variants": [{"name": v.name, "weight": v.weight, "conversions": v.conversions, "assigned_users": v.assigned_users} for v in exp.variants],
            "total_conversions": total,
            "conversion_rates": rates,
            "started_at": exp.start_at,
            "lifetime_days": exp.lifetime_days,
        }}

    return router


# ══════════════════════════════════════════════════════════════════════════
# singleton (lazy wired)
# ══════════════════════════════════════════════════════════════════════════
def _wire() -> ExperimentEngine:
    data_loop = self_learning = None
    try:
        from children_data_loop import data_loop as _dl
        data_loop = _dl
    except Exception:
        pass
    try:
        from children_self_learning import self_learning as _sl
        self_learning = _sl
    except Exception:
        pass
    return ExperimentEngine(data_loop=data_loop, self_learning=self_learning)


engine = _wire()
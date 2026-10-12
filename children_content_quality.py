#!/usr/bin/env python3
"""
Content Quality Loop -- 内容质量闭环 (closes the corner between engagement and content officer)

A genuine closed loop:
  publish -> consume -> review/rating -> quality score -> flag low-quality
  -> re-draft queue (Content Officer) -> republish -> re-measure

Signals produced:
  * `review.submitted` event into the data_loop (product analytics)
  * feedback into `self_learning` (task="content", thumbs_up/down) so the
    `content.quality` baseline is retrained on real parent ratings
  * a per-content Bayesian-smoothed quality score used to re-weight
    recommendations (poor content sinks, great content rises)
  * a re-draft queue handed to the Content Officer for human-in-the-loop rewrite

Everything is deterministic, offline-testable and privacy-preserving
(household pseudonym only, no child PII, free-text is trimmed + tagged).
"""
from __future__ import annotations

import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("content_quality")

# Bayesian prior: a brand new item starts at the global mean with weight PRIOR_W.
PRIOR_MEAN = 4.0     # out of 5
PRIOR_WEIGHT = 8.0   # equivalent to 8 ratings of the mean

# Below this smoothed score an item is a re-draft candidate.
LOW_QUALITY_THRESHOLD = 3.4
# At/above this it is "hero" content to surface harder.
HERO_THRESHOLD = 4.6

AGE_BANDS = ["3-6", "6-9", "9-12"]
LANGUAGES = ["en", "de", "fr", "nl", "es", "it"]


# ── models ──────────────────────────────────────────────────────────────────
@dataclass
class Review:
    review_id: str
    content_id: str
    household_id: str
    rating: int                       # 1..5
    language: str = "en"
    age_band: str = "6-9"
    sentiment: str = "neutral"        # positive | neutral | negative
    comment: str = ""
    tags: List[str] = field(default_factory=list)
    verified_play: bool = False       # child actually consumed the content
    at: str = field(default_factory=lambda: datetime.now().isoformat())

    def normalized(self) -> float:
        return max(0.0, min(1.0, (self.rating - 1) / 4.0))


@dataclass
class QualityItem:
    content_id: str
    reviews: int = 0
    rating_sum: int = 0
    sum_normalized: float = 0.0
    flagged: bool = False
    flag_reason: str = ""
    flagged_at: Optional[str] = None
    hero: bool = False

    def raw_avg(self) -> float:
        return self.rating_sum / self.reviews if self.reviews else 0.0

    def smoothed(self) -> float:
        """Bayesian-smoothed 1..5 score; resists single-review outliers."""
        return (PRIOR_MEAN * PRIOR_WEIGHT + self.rating_sum) / (PRIOR_WEIGHT + self.reviews)

    def quality_index(self) -> float:
        """0..1 index used for recommendation re-weighting."""
        return max(0.0, min(1.0, (self.smoothed() - 1) / 4.0))


@dataclass
class RedraftRequest:
    request_id: str
    content_id: str
    reason: str
    quality_score: float
    status: str = "queued"            # queued | in_progress | redrafted | dismissed
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: Optional[str] = None


# ── engine ──────────────────────────────────────────────────────────────────
class ContentQualityEngine:
    def __init__(self, data_loop=None, self_learning=None, recommend=None,
                 content_officer=None):
        self._lock = threading.RLock()
        self.reviews: List[Review] = []
        self.items: Dict[str, QualityItem] = {}
        self.redrafts: Dict[str, RedraftRequest] = {}
        self.data_loop = data_loop
        self.self_learning = self_learning
        self.recommend = recommend
        self.content_officer = content_officer

    # -- ingestion --
    def submit_review(self, content_id: str, household_id: str, rating: int,
                      language: str = "en", age_band: str = "6-9",
                      comment: str = "", tags: Optional[List[str]] = None,
                      verified_play: bool = False) -> Review:
        if not (1 <= int(rating) <= 5):
            raise ValueError("rating must be 1..5")
        if age_band not in AGE_BANDS:
            age_band = "6-9"
        if language not in LANGUAGES:
            language = "en"

        sentiment = "positive" if rating >= 4 else ("negative" if rating <= 2 else "neutral")
        review = Review(
            review_id=f"rev_{uuid.uuid4().hex[:10]}",
            content_id=content_id, household_id=household_id, rating=int(rating),
            language=language, age_band=age_band, sentiment=sentiment,
            comment=(comment or "").strip()[:500], tags=list(tags or [])[:8],
            verified_play=bool(verified_play),
        )

        with self._lock:
            self.reviews.append(review)
            item = self.items.setdefault(content_id, QualityItem(content_id=content_id))
            item.reviews += 1
            item.rating_sum += review.rating
            item.sum_normalized += review.normalized()
            item.hero = item.reviews >= 3 and item.smoothed() >= HERO_THRESHOLD
            self._maybe_flag(item)

        # closed-loop side effects
        self._emit_data_loop(review)
        self._feed_self_learning(review)
        return review

    def _emit_data_loop(self, review: Review):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(
                "review.submitted", review.household_id, 0, 0,
                {"content_id": review.content_id, "rating": review.rating,
                 "sentiment": review.sentiment, "language": review.language,
                 "age_band": review.age_band, "verified_play": review.verified_play})
        except Exception as exc:  # never break the caller on analytics failure
            logger.warning("data_loop emit failed: %s", exc)

    def _feed_self_learning(self, review: Review):
        if not self.self_learning:
            return
        try:
            # task="content" -> retrains the content.quality baseline
            self.self_learning.thumbs("content", review.content_id,
                                      up=review.rating >= 4)
        except Exception as exc:
            logger.warning("self_learning feed failed: %s", exc)

    def _maybe_flag(self, item: QualityItem):
        if item.reviews < 3:
            return
        if item.smoothed() < LOW_QUALITY_THRESHOLD and not item.flagged:
            item.flagged = True
            item.flag_reason = f"smoothed={item.smoothed():.2f} < {LOW_QUALITY_THRESHOLD}"
            item.flagged_at = datetime.now().isoformat()
            self._open_redraft(item)
        elif item.smoothed() >= LOW_QUALITY_THRESHOLD and item.flagged:
            # recovered after a re-draft / more reviews
            item.flagged = False
            item.flag_reason = ""

    def _open_redraft(self, item: QualityItem):
        req = RedraftRequest(
            request_id=f"rdr_{uuid.uuid4().hex[:10]}",
            content_id=item.content_id,
            reason=f"low parent rating: {item.flag_reason}",
            quality_score=round(item.smoothed(), 3),
        )
        self.redrafts[req.request_id] = req
        logger.info("Opened re-draft request %s for %s (%.2f)",
                    req.request_id, item.content_id, item.smoothed())

    # -- queries --
    def quality_score(self, content_id: str) -> float:
        with self._lock:
            item = self.items.get(content_id)
            return round(item.smoothed(), 3) if item else round(PRIOR_MEAN, 3)

    def quality_index(self, content_id: str) -> float:
        with self._lock:
            item = self.items.get(content_id)
            return round(item.quality_index(), 3) if item else 0.6

    def weight_map(self, content_ids: List[str]) -> Dict[str, float]:
        """Per-content multiplier for recommendation re-ranking (0.5..1.3)."""
        out = {}
        with self._lock:
            for cid in content_ids:
                idx = self.quality_index(cid)
                out[cid] = round(0.5 + idx * 0.8, 3)
        return out

    def rerank(self, content_ids: List[str], base_scores: Optional[Dict[str, float]] = None
               ) -> List[Dict[str, Any]]:
        """Re-rank content by (base score x quality weight). Closed-loop feedback."""
        base_scores = base_scores or {}
        weights = self.weight_map(content_ids)
        ranked = []
        with self._lock:
            for cid in content_ids:
                base = float(base_scores.get(cid, 1.0))
                final = base * weights[cid]
                item = self.items.get(cid)
                ranked.append({
                    "content_id": cid,
                    "base_score": round(base, 3),
                    "quality_weight": weights[cid],
                    "final_score": round(final, 3),
                    "quality": round(item.smoothed(), 3) if item else round(PRIOR_MEAN, 3),
                    "reviews": item.reviews if item else 0,
                    "flagged": item.flagged if item else False,
                })
        ranked.sort(key=lambda r: -r["final_score"])
        return ranked

    def low_quality(self) -> List[Dict[str, Any]]:
        with self._lock:
            flagged = [i for i in self.items.values()
                       if i.reviews >= 3 and i.smoothed() < LOW_QUALITY_THRESHOLD]
            flagged.sort(key=lambda i: i.smoothed())
        return [{"content_id": i.content_id, "smoothed": round(i.smoothed(), 3),
                 "raw_avg": round(i.raw_avg(), 3), "reviews": i.reviews} for i in flagged]

    def hero_content(self, top: int = 10) -> List[Dict[str, Any]]:
        with self._lock:
            heroes = [i for i in self.items.values() if i.reviews >= 3]
            heroes.sort(key=lambda i: -i.smoothed())
        return [{"content_id": i.content_id, "smoothed": round(i.smoothed(), 3),
                 "reviews": i.reviews} for i in heroes[:top]]

    def redraft_queue(self, status: str = "queued") -> List[Dict[str, Any]]:
        with self._lock:
            return [asdict(r) for r in self.redrafts.values()
                    if status == "all" or r.status == status]

    def resolve_redraft(self, request_id: str, status: str = "redrafted",
                        quality_score: Optional[float] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            req = self.redrafts.get(request_id)
            if not req:
                return None
            req.status = status
            req.resolved_at = datetime.now().isoformat()
            if quality_score is not None:
                req.quality_score = quality_score
            return asdict(req)

    def cohort_sentiment(self, content_id: str) -> Dict[str, Any]:
        with self._lock:
            rows = [r for r in self.reviews if r.content_id == content_id]
        by_band: Dict[str, Dict[str, float]] = defaultdict(lambda: {"n": 0, "sum": 0})
        by_lang: Dict[str, Dict[str, float]] = defaultdict(lambda: {"n": 0, "sum": 0})
        for r in rows:
            by_band[r.age_band]["n"] += 1
            by_band[r.age_band]["sum"] += r.rating
            by_lang[r.language]["n"] += 1
            by_lang[r.language]["sum"] += r.rating
        def _shape(d):
            return {k: {"n": int(v["n"]), "avg": round(v["sum"] / v["n"], 2)}
                    for k, v in d.items()}
        return {"content_id": content_id, "total": len(rows),
                "by_age_band": _shape(by_band), "by_language": _shape(by_lang)}

    def nps(self, days: int = 90) -> Dict[str, Any]:
        cutoff = datetime.now() - timedelta(days=days)
        with self._lock:
            rows = [r for r in self.reviews
                    if datetime.fromisoformat(r.at) >= cutoff]
        promoters = sum(1 for r in rows if r.rating == 5)
        detractors = sum(1 for r in rows if r.rating <= 2)
        total = len(rows)
        score = round(((promoters - detractors) / total) * 100, 1) if total else 0.0
        return {"nps": score, "promoters": promoters, "detractors": detractors,
                "passives": total - promoters - detractors, "responses": total}

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            items = list(self.items.values())
            rated = [i for i in items if i.reviews > 0]
            total_reviews = len(self.reviews)
            avg_rating = (sum(r.rating for r in self.reviews) / total_reviews) if total_reviews else 0.0
            flagged = [i for i in items if i.reviews >= 3 and i.smoothed() < LOW_QUALITY_THRESHOLD]
            heroes = [i for i in items if i.reviews >= 3 and i.smoothed() >= HERO_THRESHOLD]
            verified = sum(1 for r in self.reviews if r.verified_play)
            queued = sum(1 for r in self.redrafts.values() if r.status == "queued")
        return {
            "content_items_rated": len(rated),
            "total_reviews": total_reviews,
            "avg_rating": round(avg_rating, 3),
            "verified_reviews": verified,
            "low_quality_flagged": len(flagged),
            "hero_content": len(heroes),
            "redraft_queue_depth": queued,
            "nps": self.nps()["nps"],
        }

    # -- maintenance --
    def recompute_flags(self) -> Dict[str, Any]:
        """Re-evaluate every item (e.g. after a re-draft changed the copy)."""
        with self._lock:
            before = sum(1 for i in self.items.values() if i.flagged)
            for item in self.items.values():
                prev = item.flagged
                self._maybe_flag(item)
                if prev and not item.flagged:
                    logger.info("item %s recovered above threshold", item.content_id)
            after = sum(1 for i in self.items.values() if i.flagged)
        return {"flagged_before": before, "flagged_after": after}


# ── FastAPI router ──────────────────────────────────────────────────────────
def create_content_quality_router():
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel, Field

    router = APIRouter(prefix="/api/content-quality", tags=["content-quality"])

    class ReviewIn(BaseModel):
        content_id: str
        household_id: str
        rating: int = Field(..., ge=1, le=5)
        language: str = "en"
        age_band: str = "6-9"
        comment: str = ""
        tags: List[str] = []
        verified_play: bool = False

    class RerankIn(BaseModel):
        content_ids: List[str]
        base_scores: Dict[str, float] = {}

    class ResolveIn(BaseModel):
        request_id: str
        status: str = "redrafted"
        quality_score: Optional[float] = None

    @router.post("/reviews")
    def submit_review(req: ReviewIn):
        r = content_quality.submit_review(
            req.content_id, req.household_id, req.rating, req.language,
            req.age_band, req.comment, req.tags, req.verified_play)
        return {"ok": True, "review_id": r.review_id, "sentiment": r.sentiment}

    @router.get("/reviews/{content_id}")
    def list_reviews(content_id: str, limit: int = 50):
        rows = [asdict(r) for r in content_quality.reviews if r.content_id == content_id]
        return {"ok": True, "count": len(rows), "reviews": rows[-limit:]}

    @router.get("/score/{content_id}")
    def score(content_id: str):
        return {"ok": True, "content_id": content_id,
                "quality_score": content_quality.quality_score(content_id),
                "quality_index": content_quality.quality_index(content_id)}

    @router.get("/cohort/{content_id}")
    def cohort(content_id: str):
        return {"ok": True, "cohort": content_quality.cohort_sentiment(content_id)}

    @router.post("/rerank")
    def rerank(req: RerankIn):
        return {"ok": True, "ranked": content_quality.rerank(req.content_ids, req.base_scores)}

    @router.get("/low-quality")
    def low_quality():
        return {"ok": True, "items": content_quality.low_quality()}

    @router.get("/hero")
    def hero(top: int = 10):
        return {"ok": True, "items": content_quality.hero_content(top)}

    @router.get("/redraft-queue")
    def redraft_queue(status: str = "queued"):
        return {"ok": True, "queue": content_quality.redraft_queue(status)}

    @router.post("/redraft/resolve")
    def redraft_resolve(req: ResolveIn):
        out = content_quality.resolve_redraft(req.request_id, req.status, req.quality_score)
        if not out:
            raise HTTPException(404, "redraft request not found")
        return {"ok": True, "request": out}

    @router.post("/recompute")
    def recompute():
        return {"ok": True, "result": content_quality.recompute_flags()}

    @router.get("/nps")
    def nps(days: int = 90):
        return {"ok": True, "nps": content_quality.nps(days)}

    @router.get("/stats")
    def stats():
        return {"ok": True, "stats": content_quality.stats()}

    return router


# ── singleton (wired lazily to the other engines) ───────────────────────────
def _wire() -> ContentQualityEngine:
    data_loop = self_learning = recommend = officer = None
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
    try:
        from children_recommend import recommendation_engine as _rc
        recommend = _rc
    except Exception:
        pass
    try:
        from children_content_officer import content_officer as _co
        officer = _co
    except Exception:
        pass
    return ContentQualityEngine(data_loop=data_loop, self_learning=self_learning,
                                recommend=recommend, content_officer=officer)


content_quality = _wire()

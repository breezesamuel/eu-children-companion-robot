"""Tests for the product-side retention flywheel (children_engagement) and the
sellable European content library (children_content_db).

This is the corner that answers "would anyone actually use, buy and renew this?":
a child profile that drives adaptation, an explainable churn score, a parent
growth report, consent-gated nudges, and real European content to serve.
"""
import sys, os, logging, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_content_db as cdb
from children_engagement import (EngagementEngine, ChildProfile, Session,
                                  Sentiment, _RISK_WEIGHTS, _REPORT_COPY)
from children_data_loop import DataLoop

# German curriculum-subject labels (kept here so the test is honest about what
# the parent-facing labels are)
_SUBJ_LABELS_DE = {"Sprache & Lesen", "Zahlen & Logik", "Natur & Wissenschaft",
                   "Gefühle & Freundschaft", "Musik & Bewegung",
                   "Geschichten & Kreativität", "Sicherheit im Netz"}

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ── 1. sellable European content ─────────────────────────────────────────────
check("eu.library_exists", len(cdb.EUROPE_COURSES) >= 12,
      str(len(cdb.EUROPE_COURSES)))
check("eu.lessons_real", sum(len(c["lessons"]) for c in cdb.EUROPE_COURSES.values()) >= 60)
check("eu.schema_unified", cdb.eu_lesson_schema_check()["ok"])
check("eu.age_bands",
      {cdb.get_eu_band_for_age(a) for a in (4, 7, 11)} ==
      {"early_years", "lower_primary", "upper_primary"})
check("eu.subjects", set(cdb.EU_SUBJECTS) >= {"language_literacy",
                                              "social_emotional", "digital_safety"})
check("eu.no_ideology",
      not any("道德" in str(c.values()) for c in cdb.EUROPE_COURSES.values()))
# every EU course must declare its market and be age-banded
check("eu.market_declared",
      all(c.get("market") and c.get("band") for c in cdb.EUROPE_COURSES.values()))
pkg = cdb.get_market_package("DE")
check("eu.de_package", len(pkg["courses"]) >= 8 and pkg["lesson_count"] >= 40)
check("eu.de_has_local_language",
      any(c["course_id"] == "eu_de_phonics" for c in pkg["courses"]))
check("eu.fr_package", cdb.get_market_package("FR")["languages"][0] == "fr")
check("eu.unknown_market_falls_back",
      cdb.get_market_package("XX")["languages"] == ["en"])
# the old placeholder filler must be gone from the sellable views
check("eu.no_filler", not any(k.startswith(("k_ext_", "p_ext_", "m_ext_"))
                             for k in list(cdb.PRIMARY_COURSES)))
check("eu.eu_course_in_stage_view",
      any(k.startswith("eu_") for k in cdb.PRIMARY_COURSES))
check("eu.legacy_schema_normalised",
      cdb.lessons_schema_ok(cdb.PRIMARY_COURSES) and
      cdb.lessons_schema_ok(cdb.KINDERGARTEN_COURSES) and
      cdb.lessons_schema_ok(cdb.MIDDLE_SCHOOL_COURSES))
# a legacy map may not silently lose lessons
check("eu.cn_library_still_usable",
      len(cdb.PRIMARY_COURSES) >= 20 and len(cdb.KINDERGARTEN_COURSES) >= 8)


# ── 2. profile-driven adaptation ─────────────────────────────────────────────
dataloop = DataLoop()
e = EngagementEngine(data_loop=dataloop)
e.register_household("h1", "DE", "de", subscription_sku="SUB-STD-M",
                    consent_marketing=True)
e.register_child(ChildProfile(child_id="c1", household_id="h1", age=6,
                              language="de", interests=["Science"]))

plan = e.recommend_plan("c1", 5)
check("adapt.plan_size", len(plan) == 5)
check("adapt.age_band_respected",
      all(cdb.EUROPE_COURSES[p["course_id"]]["band"] == "lower_primary"
          for p in plan))
check("adapt.interest_match",
      any("Science" in r or "science" in r.lower()
          for p in plan for r in p["reasons"]))
check("adapt.unplayed_first", plan[0]["course_id"] != "eu_de_phonics")
check("adapt.no_plan_for_unknown", e.recommend_plan("nobody") == [])
# age band is a *hard* filter -- a 4-year-old never gets 9-12 content
e.register_child(ChildProfile("c2", "h1", age=4, language="de"))
pl2 = e.recommend_plan("c2", 5)
check("adapt.young_child_band_only",
      all(cdb.EUROPE_COURSES[p["course_id"]]["band"] == "early_years" for p in pl2))


# ── 3. engagement measurement & retention ───────────────────────────────────
for m, act, cid, comp, sent in [
        (20, "language_literacy", "eu_de_phonics", True, Sentiment.POSITIVE),
        (25, "science_nature", "eu_sci_junior", True, Sentiment.POSITIVE),
        (15, "music_movement", "eu_music_early", True, Sentiment.NEUTRAL)]:
    e.log_session(Session("c1", m, act, cid, comp, sent))

snap = e.engagement_snapshot("c1")
check("engage.minutes", snap["minutes"] == 60, str(snap["minutes"]))
check("engage.completion", snap["completion_rate"] == 1.0)
check("engage.active_days", snap["active_days"] >= 1)
check("engage.streak", snap["streak_days"] >= 1)
check("engage.sentiment_split",
      snap["sentiment"]["positive"] == 2 and snap["sentiment"]["neutral"] == 1)
check("engage.top_activities", len(snap["top_activities"]) >= 2)
check("engage.data_loop_receives_events",
      dataloop._counts.get("learning.session", 0) == 3,
      str(dataloop._counts.get("learning.session")))

exh = e.content_exhaustion("c1")
check("engage.exhaustion_partial", 0.0 < exh["exhaustion"] < 1.0)
check("engage.exhaustion_no_pii", "h1" not in json.dumps(exh))

risk = e.retention_risk("c1")
check("risk.explainable", risk["level"] == "low" and risk["reasons"] == [])
check("risk.weights_documented", set(risk["weights"]) == set(_RISK_WEIGHTS))
check("risk.bounded", 0.0 <= risk["risk"] <= 1.0)
check("risk.renewal_complement",
      e.renewal_probability("c1") == round(1 - risk["risk"], 3))

# high risk: three bad signals
e.register_household("h2", "DE", "de", consent_marketing=True)
e.register_child(ChildProfile("c2b", "h2", age=6, language="de"))
e.log_session(Session("c2b", 30, "lesson", "eu_de_phonics", True, Sentiment.POSITIVE))
e.log_session(Session("c2b", 30, "lesson", "eu_num_junior", True, Sentiment.POSITIVE))
e.log_session(Session("c2b", 5, "lesson", "eu_sci_junior", False, Sentiment.FRUSTRATED))
e.log_session(Session("c2b", 4, "lesson", "eu_music_early", False, Sentiment.NEGATIVE))
r2 = e.retention_risk("c2b")
check("risk.high_detected", r2["level"] in ("medium", "high"), str(r2))
check("risk.reasons_present", len(r2["reasons"]) >= 2, str(r2["reasons"]))
check("risk.low_completion_flag",
      any("completion" in x for x in r2["reasons"]), str(r2["reasons"]))


# ── 4. parent value proof (the attraction) ───────────────────────────────────
rep = e.growth_report("c1", 7, "de")
check("report.german_headline",
      "Minuten" in rep.headline and "Tag" in rep.headline, rep.headline)
check("report.subjects_are_subjects",
      set(rep.subjects_covered) <= set(_SUBJ_LABELS_DE), str(rep.subjects_covered))
check("report.skills", rep.skills_progress and
      all("skill" in s and "sessions" in s for s in rep.skills_progress))
check("report.next_suggestion", "Nächster Vorschlag" in rep.next_suggestion)
check("report.no_child_name_in_payload",
      "first_name" not in json.dumps(rep.to_dict()))
en = e.growth_report("c1", 7, "en")
check("report.english_headline", "minutes of learning" in en.headline)
check("report.singular_day", "1 day" in en.headline, en.headline)
check("report.empty_state",
      "No sessions" in e.growth_report("ghost", 7, "en").headline)


# ── 5. consent-gated nudges ──────────────────────────────────────────────────
check("nudge.none_when_low_risk", e.due_nudges("c1") == [])
check("nudge.consent_gated",
      e.due_nudges("c2b") != [],
      "a household WITH consent gets a nudge when risk is high")
e2 = EngagementEngine()
e2.register_household("hnc", "DE", "de", consent_marketing=False)
e2.register_child(ChildProfile("cnc", "hnc", age=6, language="de"))
e2.log_session(Session("cnc", 30, "lesson", "eu_de_phonics", True, Sentiment.POSITIVE))
e2.log_session(Session("cnc", 5, "lesson", "eu_num_junior", False, Sentiment.NEGATIVE))
check("nudge.no_consent_no_send", e2.due_nudges("cnc") == [])


# ── 6. referral ──────────────────────────────────────────────────────────────
ref = e.create_referral("h1")
check("referral.code", ref["code"].startswith("REF-"))
check("referral.reward", ref["reward_cents"] == 1000)
check("referral.attribute", e.attribute_referral(ref["code"], "h9")["converted"] == 1)
check("referral.unknown_code", e.attribute_referral("NOPE", "h8")["ok"] is False)


# ── 7. stats / stats are honest ──────────────────────────────────────────────
st = e.stats()
check("stats.counts", st["children"] >= 2 and st["households"] >= 2)
check("stats.avg_risk_bounded", 0.0 <= st["avg_churn_risk"] <= 1.0)
check("stats.consent_documented", "consent" in st["consent_model"].lower())
check("stats.avg_renewal", st["avg_renewal_probability"] >= 0.0)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 62)
print(f"Engagement + EU content: {len(R)-n_fail}/{len(R)} checks passed, "
      f"{n_fail} failed")
print("=" * 62)
sys.exit(1 if n_fail else 0)

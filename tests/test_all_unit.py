#!/usr/bin/env python3
"""Unit tests for all children_* modules."""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

PASS = 0
FAIL = 0
def t(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        print(f"  OK  {name}")
    except Exception as e:
        FAIL += 1
        print(f"  FAIL {name}: {e}")

# --- Content DB ---
def test_content_db():
    from children_content_db import (STAGES, PRIMARY_COURSES,
                                    MIDDLE_SCHOOL_COURSES, KINDERGARTEN_COURSES,
                                    QUIZ_DATABASE, EUROPE_COURSES,
                                    get_market_package, get_eu_band_for_age,
                                    lessons_schema_ok, eu_lesson_schema_check)
    assert len(STAGES) == 3
    # curated CN curriculum floors (the template filler k_ext_*/p_ext_*/m_ext_*
    # was removed, so these are real course counts now)
    assert len(PRIMARY_COURSES) >= 25, len(PRIMARY_COURSES)
    assert len(MIDDLE_SCHOOL_COURSES) >= 20, len(MIDDLE_SCHOOL_COURSES)
    assert len(KINDERGARTEN_COURSES) >= 8, len(KINDERGARTEN_COURSES)
    assert len(QUIZ_DATABASE) == 29
    stage_keys = list(STAGES.keys())
    assert "kindergarten" in stage_keys
    assert "primary" in stage_keys
    assert "middle_school" in stage_keys
    sample = list(PRIMARY_COURSES.values())[0]
    assert "course_id" in sample
    assert "lessons" in sample
    assert len(sample["lessons"]) > 0

    # ---- the sellable European library (the product's actual market) ----
    assert len(EUROPE_COURSES) >= 12, len(EUROPE_COURSES)
    assert eu_lesson_schema_check()["ok"]
    total_eu = sum(len(c["lessons"]) for c in EUROPE_COURSES.values())
    assert total_eu >= 60, total_eu
    # every EU course is age-banded, market-tagged and has real lessons
    for cid, c in EUROPE_COURSES.items():
        assert c["band"] in ("early_years", "lower_primary", "upper_primary"), cid
        assert c["market"] and c["lessons"], cid
    # schema is unified across every stage view
    for m in (PRIMARY_COURSES, KINDERGARTEN_COURSES, MIDDLE_SCHOOL_COURSES):
        assert lessons_schema_ok(m)
    # a market package resolves to real, sellable courses
    pkg = get_market_package("DE")
    assert pkg["lesson_count"] >= 40 and pkg["languages"][0] == "de"
    assert get_market_package("XX")["languages"] == ["en"]   # unknown -> fallback
    # age banding is the hard filter on adaptation
    assert get_eu_band_for_age(4) == "early_years"
    assert get_eu_band_for_age(7) == "lower_primary"
    assert get_eu_band_for_age(11) == "upper_primary"
    # no filler ids left behind
    assert not [k for k in PRIMARY_COURSES if k.startswith("p_ext_")]
    assert not [k for k in KINDERGARTEN_COURSES if k.startswith("k_ext_")]

def test_pagination():
    from children_content_db import PRIMARY_COURSES
    from children_pagination import paginate
    items = list(PRIMARY_COURSES.values())
    p1 = paginate(items, 1, 5)
    assert p1["pagination"]["page"] == 1
    assert len(p1["items"]) == 5
    assert p1["pagination"]["has_next"] is True
    p2 = paginate(items, 10, 5)
    assert p2["pagination"]["page"] == 10
    assert p2["pagination"]["has_next"] is False or len(p2["items"]) == 0
    p_invalid = paginate(items, 0, 0)
    assert p_invalid["pagination"]["page"] == 1
    p_large = paginate(items, 1, 200)
    assert p_large["pagination"]["page_size"] == 100

def test_education():
    from children_education import education_system
    skills = education_system.get_all_skills()
    assert len(skills) == 12
    cats = education_system.get_skills_by_category("math")
    assert len(cats) > 0
    stage_skills = education_system.get_stage_skills("kindergarten")
    assert isinstance(stage_skills, list)

def test_learning():
    from children_learning import learning_system
    enroll = learning_system.enroll("ut_user", "math_g1")
    assert enroll is not None
    record = learning_system.record_lesson("ut_user", "math_g1", 1, 95, 30)
    assert record is not None
    report = learning_system.get_report("ut_user")
    assert isinstance(report, dict)
    courses = learning_system.get_stage_courses("primary")
    assert isinstance(courses, list)

def test_emotional():
    from children_emotional import emotional_system
    analysis = emotional_system.analyze_emotion("ut_user", "I am very happy")
    assert isinstance(analysis, dict)
    assert "emotion" in analysis
    companion = emotional_system.provide_companion("ut_user", "sad", "I feel sad")
    assert isinstance(companion, dict) and len(companion) > 0
    trends = emotional_system.get_emotion_trends("ut_user")
    assert isinstance(trends, list) or isinstance(trends, dict)

def test_conversation():
    from children_conversation import conversation_system
    resp = conversation_system.process_message("ut_user", "Hello", "ut_session")
    assert resp is not None
    assert isinstance(resp, dict)

def test_growth():
    from children_growth import growth_system
    timeline = growth_system.get_timeline("ut_user")
    assert isinstance(timeline, list)
    goals = growth_system.get_next_goals("ut_user")
    assert isinstance(goals, list)
    summary = growth_system.get_stage_achievements_summary()
    assert isinstance(summary, list) or isinstance(summary, dict)

def test_device():
    from children_device import device_control
    devices = device_control.get_devices()
    assert isinstance(devices, list)
    assert len(devices) >= 3
    detail = device_control.get_device_detail("robot_c2")
    assert isinstance(detail, dict) or detail is None

def test_security():
    from children_security import security
    status = security.get_security_status()
    assert isinstance(status, dict)
    consent = security.get_consent("ut_user")
    assert isinstance(consent, dict) or consent is None
    score = security.get_security_score()
    assert isinstance(score, dict) and "overall_score" in score

def test_admin():
    from children_admin import admin_system
    kpi = admin_system.get_dashboard_kpi()
    assert isinstance(kpi, dict)
    assert len(kpi) >= 5
    stats = admin_system.get_stage_statistics()
    assert isinstance(stats, (list, dict))

def test_data_sync():
    from children_data_sync import data_sync
    status = data_sync.get_sync_status()
    assert isinstance(status, (dict, list))
    stats = data_sync.get_sync_stats()
    assert isinstance(stats, dict)

def test_recommend():
    from children_recommend import recommendation_engine
    profile = recommendation_engine.build_profile("ut_user",
        learning_records=[{"course_id": "p_g1_math", "score": 90}])
    assert "stage" in profile
    courses = recommendation_engine.recommend_courses("ut_user")
    assert isinstance(courses, list)
    quizzes = recommendation_engine.recommend_quizzes("ut_user")
    assert isinstance(quizzes, list)
    all_rec = recommendation_engine.recommend_all("ut_user")
    assert "courses" in all_rec

def test_config():
    from children_config import settings
    assert settings.port == 8888
    assert settings.host == "0.0.0.0"
    d = settings.to_dict()
    assert "port" in d
    assert "log_level" in d

def test_entertainment():
    from children_entertainment import entertainment
    content = entertainment.get_content()
    assert isinstance(content, list)
    assert len(content) > 0
    summary = entertainment.get_stage_summary()
    assert isinstance(summary, dict) or isinstance(summary, list)

def test_edge_ai():
    from children_edge_ai import edge_ai
    models = edge_ai.get_models()
    assert isinstance(models, list) or isinstance(models, dict)
    stats = edge_ai.get_inference_stats()
    assert isinstance(stats, dict)

def test_langchain():
    from children_langchain import langchain_integration
    models = langchain_integration.get_available_models()
    assert isinstance(models, list) or isinstance(models, dict)

def test_langgraph():
    from children_langgraph import langgraph_workflow
    workflows = langgraph_workflow.get_all_workflows()
    assert isinstance(workflows, list)

# === RUN ALL ===
def test_analytics():
    from children_analytics import analytics
    record = analytics.snapshot()
    assert "data" in record
    assert "education" in record["data"]
    report = analytics.user_report("test")
    assert "user_id" in report
    health = analytics.system_health()
    assert "status" in health

def test_notifications():
    from children_notifications import notifications
    r = notifications.send("test", "in_app", "Title", "Body")
    assert r["success"]
    ns = notifications.get_notifications("test")
    assert len(ns) == 1
    r2 = notifications.send_template("test", "in_app", "achievement_unlocked", {"achievement": "Star"})
    assert r2["success"]
    stats = notifications.stats()
    assert stats["total"] == 2

def test_cache():
    from children_cache import cache
    cache.set("ut_key", "ut_val", ttl=5)
    assert cache.get("ut_key") == "ut_val"
    stats = cache.stats()
    assert stats["hits"] >= 1
    cache.delete("ut_key")
    assert cache.get("ut_key") is None

def test_auth():
    import os
    uid = f"ut_auth_{os.getpid()}"
    from children_auth import register_user, authenticate, verify_token, parse_auth_header, require_role
    r = register_user(uid, "pass123", "child")
    assert r["success"]
    tok = authenticate(uid, "pass123")
    assert tok is not None and tok.get("success")
    payload = verify_token(tok["token"])
    assert payload["username"] == uid
    parsed = parse_auth_header(f"Bearer {tok['token']}")
    assert parsed["username"] == uid
    perm = require_role({"role": "child"}, "parent")
    assert not perm
    perm2 = require_role({"role": "admin"}, "parent")
    assert perm2

def test_database():
    from children_database import database
    stats = database.get_stats()
    assert "users" in stats
    database.log_audit("ut_db", "unit_test", "test", "detail")
    logs = database.get_audit_log(5)
    assert len(logs) >= 1
    rec = database.record_learning("ut_db_user", "c1", "l1", 85.0, 20)
    assert rec > 0
    hist = database.get_learning_history("ut_db_user")
    assert len(hist) >= 1
    emo = database.record_emotion("ut_db_user", "happy", 0.8)
    assert emo > 0
    ehist = database.get_emotion_history("ut_db_user")
    assert len(ehist) >= 1

def test_search():
    from children_search import search_engine
    from children_content_db import STAGES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES, QUIZ_DATABASE
    content_db = {
        "kindergarten_courses": STAGES.get("kindergarten", {}).get("courses", []),
        "primary_courses": PRIMARY_COURSES,
        "middle_school_courses": MIDDLE_SCHOOL_COURSES,
        "quiz_database": QUIZ_DATABASE,
    }
    search_engine.reindex(content_db)
    results = search_engine.search("math")
    assert isinstance(results, dict)
    assert "total" in results
    suggests = search_engine.suggest("ma")
    assert isinstance(suggests, list)

def test_api_docs():
    from children_api_docs import build_openapi_json, generate_route_docs
    from children_robot_system import app
    routes = generate_route_docs(app)
    spec = build_openapi_json(routes)
    assert "openapi" in spec
    assert "info" in spec
    assert "paths" in spec
    info = spec["info"]
    assert "API" in info["title"]

def test_scheduler():
    from children_scheduler import scheduler
    status = scheduler.status()
    assert len(status) >= 3
    tasks = {t["name"]: t for t in status}
    assert "backup_database" in tasks
    assert "cleanup_backups" in tasks
    assert "daily_report" in tasks

def test_files():
    from children_files import file_manager
    r = file_manager.save("ut_test.txt", b"unit test", "ut_file_user")
    assert r is not None
    fid = r["file_id"]
    info = file_manager.get(fid)
    assert info["original_name"] == "ut_test.txt"
    listed = file_manager.list_by_user("ut_file_user")
    assert len(listed) >= 1
    stats = file_manager.get_stats()
    assert stats["total_files"] >= 1
    assert stats["total_bytes"] > 0
    file_manager.delete(fid)
    assert file_manager.get(fid) is None

def test_i18n():
    from children_i18n import i18n
    assert "Welcome" in i18n.t("welcome", "en")
    assert "Bienvenue" in i18n.t("welcome", "fr")
    assert "Willkommen" in i18n.t("welcome", "de")
    assert i18n.t("nonexistent", "en") == "nonexistent"
    locales = i18n.get_supported_locales()
    assert len(locales) == 6
    i18n.set_user_locale("ut_i18n", "de")
    assert i18n.get_user_locale("ut_i18n") == "de"

def test_sessions():
    from children_sessions import session_manager
    s = session_manager.create("ut_sess", "child", {"test": True})
    sid = s["session_id"]
    g = session_manager.get(sid)
    assert g["user_id"] == "ut_sess"
    listed = session_manager.list_user_sessions("ut_sess")
    assert len(listed) >= 1
    stats = session_manager.get_stats()
    assert stats["active_sessions"] >= 1
    session_manager.revoke(sid)
    assert session_manager.get(sid) is None

def test_parental():
    from children_parental import parental_control
    parental_control.set_screen_time_limit("ut_parent", 120)
    rem = parental_control.get_screen_time_remaining("ut_parent")
    assert rem["limit_minutes"] == 120
    parental_control.log_activity("ut_parent", "learning", "Math", 30)
    report = parental_control.get_activity_report("ut_parent", 7)
    assert report["total_activities"] >= 1
    parental_control.set_content_filter("ut_parent", "violence", True)
    assert not parental_control.is_content_allowed("ut_parent", "violence")
    parental_control.set_learning_goal("ut_parent", "Finish book", "5 chapters", "chapters")
    dash = parental_control.get_dashboard("ut_parent")
    assert "screen_time" in dash
    assert "activity" in dash

def test_metrics():
    from children_metrics import metrics
    metrics.increment("ut_test_count")
    metrics.gauge("ut_test_gauge", 3.14)
    snap = metrics.snapshot()
    assert snap["counters"].get("ut_test_count") == 1
    assert snap["gauges"].get("ut_test_gauge") == 3.14
    prom = metrics.prometheus_format()
    assert "# HELP" in prom
    assert "ut_test_count" in prom

def test_webhooks():
    from children_webhooks import webhook_manager
    hook = webhook_manager.register("https://ut.example.com/hook", ["ut.event"], "ut_secret")
    assert "id" in hook
    hooks = webhook_manager.list_webhooks()
    assert len(hooks) >= 1
    matches = webhook_manager.get_matching("ut.event")
    assert len(matches) >= 1
    webhook_manager.delete(hook["id"])
    hooks_after = webhook_manager.list_webhooks()
    assert len(hooks_after) < len(hooks)

tests = [
    ("Content DB", test_content_db),
    ("Pagination", test_pagination),
    ("Education", test_education),
    ("Learning", test_learning),
    ("Emotional", test_emotional),
    ("Conversation", test_conversation),
    ("Growth", test_growth),
    ("Device", test_device),
    ("Security", test_security),
    ("Admin", test_admin),
    ("Data Sync", test_data_sync),
    ("Recommend", test_recommend),
    ("Config", test_config),
    ("Entertainment", test_entertainment),
    ("Edge AI", test_edge_ai),
    ("LangChain", test_langchain),
    ("LangGraph", test_langgraph),
    ("Analytics", test_analytics),
    ("Notifications", test_notifications),
    ("Cache", test_cache),
    ("Auth", test_auth),
    ("Database", test_database),
    ("Search", test_search),
    ("API Docs", test_api_docs),
    ("Scheduler", test_scheduler),
    ("Files", test_files),
    ("i18n", test_i18n),
    ("Sessions", test_sessions),
    ("Parental", test_parental),
    ("Metrics", test_metrics),
    ("Webhooks", test_webhooks),
]

print()
for name, fn in tests:
    t(name, fn)

print(f"\n{PASS}/{PASS+FAIL} passed, {FAIL}/{PASS+FAIL} failed")
sys.exit(0 if FAIL == 0 else 1)

#!/usr/bin/env python3
"""
CI Simulator — 生成真实感但明确标记的合成 learning.session 事件.

仅在 SIMULATE_ENGAGEMENT=1 (CI) 时使用。生产环境绝不运行此脚本。

设计原则：
- 生成的事件带有 source="ci-simulator" 标记，Retention Engine 可识别
- 模拟真实家庭的使用模式：工作日活跃、周末高峰、新鲜感衰减
- 可配置家庭数、天数、活跃度分布
- 绝不写入生产 data_loop（仅内存/临时文件）
"""
import os
import sys
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from children_data_loop import DataLoop, anon  # noqa: E402


def simulate_households(
    num_households: int = 10,
    days: int = 30,
    base_activity: float = 0.6,
    novelty_decay: float = 0.02,
    weekend_boost: float = 1.3,
) -> DataLoop:
    """
    Generate synthetic learning.session events for CI testing.

    Args:
        num_households: number of synthetic households
        days: simulation window (days back from now)
        base_activity: probability of a session on any given day
        novelty_decay: daily decay factor for engagement
        weekend_boost: multiplier for Sat/Sun activity
    """
    dl = DataLoop()
    now = datetime.now()

    for h in range(num_households):
        household_id = f"ci-hh-{h:03d}"
        anon_key = anon(household_id)

        # Each household has its own "engagement personality"
        activity_level = random.uniform(0.3, 0.9) * base_activity
        preferred_times = [random.randint(15, 20) for _ in range(3)]  # after school
        preferred_subjects = random.sample([
            "language_literacy", "math_logic", "science_nature",
            "social_emotional", "music_movement", "stories_creativity",
            "digital_safety"
        ], k=random.randint(2, 4))

        # Generate sessions day by day with novelty decay
        for day_offset in range(days):
            day = now - timedelta(days=day_offset)
            is_weekend = day.weekday() >= 5
            daily_prob = activity_level * (1 - novelty_decay * day_offset)
            if is_weekend:
                daily_prob *= weekend_boost
            daily_prob = min(0.95, max(0.05, daily_prob))

            if random.random() > daily_prob:
                continue

            # 1-3 sessions per active day
            num_sessions = random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]

            for s in range(num_sessions):
                hour = random.choice(preferred_times) + random.randint(-1, 1)
                hour = max(7, min(21, hour))
                minute = random.randint(0, 59)
                at = day.replace(hour=hour, minute=minute, second=0, microsecond=0)

                subject = random.choice(preferred_subjects)
                minutes = random.randint(5, 30)
                completed = random.random() < (0.7 + activity_level * 0.2)

                # Sentiment correlates with completion and novelty
                if completed and random.random() > 0.2:
                    sentiment = random.choices(
                        ["positive", "neutral"],
                        weights=[0.7, 0.3]
                    )[0]
                elif not completed:
                    sentiment = random.choices(
                        ["frustrated", "negative", "neutral"],
                        weights=[0.4, 0.3, 0.3]
                    )[0]
                else:
                    sentiment = "neutral"

                # Content ID from EU curriculum
                content_map = {
                    "language_literacy": ["eu_de_phonics", "eu_de_vocab", "eu_fr_lecture"],
                    "math_logic": ["eu_de_zahlen", "eu_fr_nombres", "eu_nl_rekenen"],
                    "science_nature": ["eu_sci_junior", "eu_nature_explore", "eu_body_science"],
                    "social_emotional": ["eu_emotions", "eu_friendship", "eu_empathy"],
                    "music_movement": ["eu_music_early", "eu_rhythm", "eu_dance"],
                    "stories_creativity": ["eu_story_early", "eu_creative_write", "eu_puppet"],
                    "digital_safety": ["eu_online_safe", "eu_privacy_basics", "eu_cyber_kind"],
                }
                content_id = random.choice(content_map.get(subject, ["eu_general"]))

                dl.emit("learning.session", household_id, cost_cents=minutes,
                    properties={
                        "minutes": minutes,
                        "activity": subject,
                        "content_id": content_id,
                        "completed": completed,
                        "sentiment": sentiment,
                        "source": "ci-simulator",  # 明确标记来源
                        "simulated": True,          # never counts as a real household
                    },
                    at=at.isoformat())

    return dl


def main():
    if os.getenv("SIMULATE_ENGAGEMENT", "0") not in ("1", "true", "True"):
        print("ERROR: SIMULATE_ENGAGEMENT not set. This script is for CI only.")
        sys.exit(1)

    # Parse args
    num_hh = int(os.getenv("SIM_NUM_HOUSEHOLDS", "15"))
    days = int(os.getenv("SIM_DAYS", "30"))
    out_path = os.getenv("SIM_OUTPUT", "runtime/sim_data_loop.json")

    print(f"[CI Simulator] Generating {num_hh} households × {days} days...")
    dl = simulate_households(num_households=num_hh, days=days)

    # Stats
    total_sessions = dl._counts.get("learning.session", 0)
    unique_users = len({anon(f"ci-hh-{h:03d}") for h in range(int(os.getenv("SIM_NUM_HOUSEHOLDS", "15")))})
    print(f"[CI Simulator] Generated {total_sessions} sessions for {unique_users} households")

    # Save for inspection
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "source": "ci-simulator",
            "households": int(os.getenv("SIM_NUM_HOUSEHOLDS", "15")),
            "days": days,
            "total_sessions": total_sessions,
            "events": [
                {
                    "event_id": e.event_id,
                    "name": e.name,
                    "at": e.at,
                    "anon_user_key": e.anon_user_key,
                    "properties": e.properties,
                }
                for e in dl._events
                if e.name == "learning.session"
            ]
        }, f, ensure_ascii=False, indent=2)

    print(f"[CI Simulator] Saved to {out_path}")


if __name__ == "__main__":
    main()
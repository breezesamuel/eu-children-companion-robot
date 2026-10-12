#!/usr/bin/env python3
"""
Growth Execution — 把"营收目标计划"变成"今天就能上架/去谈/发出去的实物".

The revenue planner answers *how much* must be sold. This module answers *how*:
it turns that plan into the actual go-to-market deliverables a team can ship,
with the real unit economics behind every number:

  * marketplace feed   -> one row per SKU per EU marketplace (Amazon.de/fr/nl, bol.com)
  * retailer pitch     -> a distributor one-pager with wholesale maths done honestly
                          (and it exposes the hard truth: at €299 MSRP a 40 % retail
                           margin leaves almost nothing on hardware — the profit is the
                           subscription, so the pitch sells shelf space + a bounty)
  * ramp schedule      -> month-by-month volume + subscriber base + coverage of target,
                          because you never sell 23/day on day one
  * daily checklist    -> the exact "must be true today" runbook the 24/7 loop enforces

Nothing here invents demand. It produces the assets and the arithmetic that make the
plan executable and measurable. Events: growth.kit_built · growth.feed_exported ·
growth.ramp_computed · growth.checklist_built.
"""
from __future__ import annotations

import csv
import io
import logging
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("growth_execution")

DAYS_PER_MONTH = 30.4375

# ── the product (matches children_content_officer brand + planner SKU) ──────
PRODUCT = {
    "sku": "RB-2026-A1",
    "name": "RoboBuddy",
    "brand": "Learning Companion Robotics",
    "currency": "EUR",
    "price_cents": 29900,
    "subscription_sku": "SUB-STD-M",
    "subscription_price_cents": 2990,
}

# ── EU launch marketplaces (locale, currency) ──────────────────────────────
MARKETPLACES = {
    "amazon_de": {"channel": "Amazon", "country": "DE", "locale": "de-DE", "currency": "EUR"},
    "amazon_fr": {"channel": "Amazon", "country": "FR", "locale": "fr-FR", "currency": "EUR"},
    "amazon_nl": {"channel": "Amazon", "country": "NL", "locale": "nl-NL", "currency": "EUR"},
    "bol_nl": {"channel": "bol.com", "country": "NL", "locale": "nl-NL", "currency": "EUR"},
    "amazon_it": {"channel": "Amazon", "country": "IT", "locale": "it-IT", "currency": "EUR"},
}

# ── copy per language (kept short, factual; long copy lives in content_officer) ──
_BULLETS = {
    "de": ["Sprachbegleiter für Kinder von 3–10 Jahren",
           "Offline-KI auf dem Gerät — keine Daten in der Cloud",
           "DSGVO-konform, kindersicher, EU-gehostet",
           "Täglicher Lernplan mit Fortschrittsbericht für Eltern",
           "Abonnement kündbar, 14 Tage kostenlos testen"],
    "fr": ["Compagnon linguistique pour enfants de 3 à 10 ans",
           "IA embarquée hors ligne — aucune donnée dans le cloud",
           "Conforme RGPD, sécurisé pour enfants, hébergé dans l'UE",
           "Plan d'apprentissage quotidien avec rapport parental",
           "Abonnement résiliable, 14 jours d'essai gratuit"],
    "nl": ["Taalmaatje voor kinderen van 3–10 jaar",
           "AI op het apparaat, offline — geen data naar de cloud",
           "AVG-compliant, kindveilig, gehost in de EU",
           "Dagelijks leerplan met voortgangsrapport voor ouders",
           "Abonnement opzegbaar, 14 dagen gratis proberen"],
    "it": ["Compagno linguistico per bambini dai 3 ai 10 anni",
           "IA on-device offline — nessun dato nel cloud",
           "Conforme al GDPR, sicuro per i bambini, hosting UE",
           "Piano di apprendimento quotidiano con report per i genitori",
           "Abbonamento disdicibile, 14 giorni di prova gratuita"],
    "en": ["Language companion for children aged 3–10",
           "Offline on-device AI — no data sent to the cloud",
           "GDPR-compliant, child-safe, EU-hosted",
           "Daily learning plan with a parent progress report",
           "Cancel anytime, 14-day free trial"],
}


def _lang_of(locale: str) -> str:
    return (locale or "en").split("-")[0]


# ── the execution engine ────────────────────────────────────────────────────
class GrowthExecutionEngine:
    def __init__(self, planner=None, data_loop=None):
        self._lock = threading.RLock()
        self.data_loop = data_loop
        if planner is None:
            from children_revenue_planner import planner as planner
        self.planner = planner

    # ── marketplace feed ───────────────────────────────────────────────────
    def marketplace_feed(self) -> Dict[str, Any]:
        """Normalised catalogue feed, one row per SKU per marketplace.

        Row schema is channel-neutral; the exporter documents the mapping so an
        operator can adapt it to each channel's flat-file spec (no fabricated
        promise that this is already Amazon's proprietary template).
        """
        p = self.planner.compute()
        price = self.planner.a.robot_price_cents
        rows = []
        for mp_id, mp in MARKETPLACES.items():
            lang = _lang_of(mp["locale"])
            rows.append({
                "marketplace_id": mp_id,
                "channel": mp["channel"],
                "country": mp["country"],
                "locale": mp["locale"],
                "currency": mp["currency"],
                "sku": PRODUCT["sku"],
                "brand": PRODUCT["brand"],
                "title": PRODUCT["name"],
                "price": round(price / 100, 2),
                "subscription_sku": PRODUCT["subscription_sku"],
                "subscription_price": round(PRODUCT["subscription_price_cents"] / 100, 2),
                "bullets": _BULLETS.get(lang, _BULLETS["en"]),
                "condition": "new",
                "availability": "in_stock",
                "required_units_per_day": round(
                    p["required"]["households_per_day"]
                    * self.planner.a.channel_mix.get("marketplace", 0.0)
                    / max(len([m for m in MARKETPLACES]), 1), 2),
            })
        out = {
            "generated_at": datetime.now().isoformat(),
            "product": PRODUCT,
            "rows": rows,
            "mapping_note": ("channel-neutral feed; map columns to each channel's "
                             "flat-file spec before upload"),
        }
        self._emit("growth.feed_exported", {"rows": len(rows)})
        return out

    def marketplace_feed_csv(self) -> str:
        feed = self.marketplace_feed()
        buf = io.StringIO()
        w = csv.writer(buf)
        rows = feed["rows"]
        if not rows:
            return ""
        cols = ["marketplace_id", "channel", "country", "locale", "currency",
                "sku", "brand", "title", "price", "subscription_sku",
                "subscription_price", "condition", "availability",
                "required_units_per_day", "bullets"]
        w.writerow(cols)
        for r in rows:
            w.writerow([" | ".join(r[c]) if c == "bullets" else r[c] for c in cols])
        self._emit("growth.feed_exported", {"format": "csv", "rows": len(rows)})
        return buf.getvalue()

    # ── retailer / distributor pitch (honest wholesale maths) ───────────────
    def retailer_pitch(self, retailer: str = "EU toy/electronics chain",
                       retail_margin: float = 0.40,
                       referral_bounty_cents: int = 1500) -> Dict[str, Any]:
        msrp = self.planner.a.robot_price_cents
        cost = self.planner.a.robot_cost_cents
        wholesale = int(round(msrp * (1 - retail_margin)))
        our_hw_margin = wholesale - cost
        p = self.planner.compute()
        attach = self.planner.a.attach_rate
        sub_net = p["unit_economics_cents"]["sub_net_month"]  # already EUR cents
        months = p["unit_economics_cents"]["expected_months_year1"]
        # lifetime value we keep from each shelf sale (subscription + bounty cost)
        sub_value = attach * months * sub_net - referral_bounty_cents
        total_per_shelf_sale = our_hw_margin + sub_value
        return {
            "retailer": retailer,
            "msrp_cents": msrp,
            "retail_margin_pct": round(retail_margin * 100, 1),
            "wholesale_price_cents": wholesale,
            "our_cogs_cents": cost,
            "our_hardware_margin_cents": our_hw_margin,
            "subscription_attach_rate": attach,
            "expected_months_year1": months,
            "referral_bounty_cents": referral_bounty_cents,
            "our_subscription_value_cents": round(sub_value, 0),
            "our_total_margin_per_shelf_sale_cents": round(total_per_shelf_sale, 0),
            "hardware_only_is_thin": our_hw_margin < (msrp * 0.20),
            "pitch_line": (
                f"Stock {PRODUCT['name']} at {retail_margin*100:.0f}% margin; you keep "
                f"the hardware sale, we pay a {referral_bounty_cents/100:.2f} EUR bounty "
                f"per activation and run the software, support and GDPR compliance."
            ),
            "honest_warning": (
                "At this MSRP a 40% retail margin leaves a thin hardware margin; "
                "the economics only close with the subscription attach. Do not sell "
                "the shelf deal on hardware margin alone — price MSRP higher or "
                "lower COGS first." if our_hw_margin < (msrp * 0.20) else
                "Hardware margin is adequate for a retail deal."),
        }

    # ── 90-day / 12-month ramp ──────────────────────────────────────────────
    def ramp_schedule(self, months: int = 12, start_fraction: float = 0.1,
                      ramp_months: int = 6) -> Dict[str, Any]:
        """Honest build-up: volume and recurring base grow over time.

        coverage% compares monthly *contribution* (hardware margin + recurring
        subscription net) to the monthly revenue target. It will be below 100%
        early — that is the point.
        """
        p = self.planner.compute()
        req_hh_day = p["required"]["households_per_day"]
        target_month_cents = p["target"]["daily_eur"] * 100 * DAYS_PER_MONTH
        hw_margin = p["unit_economics_cents"]["robot_margin"]        # EUR cents
        sub_net = p["unit_economics_cents"]["sub_net_month"]         # EUR cents
        attach = self.planner.a.attach_rate
        churn = self.planner.a.monthly_churn

        base = 0.0
        schedule = []
        for m in range(1, months + 1):
            frac = min(1.0, start_fraction + (1.0 - start_fraction) * (m - 1) / max(ramp_months, 1))
            hh = req_hh_day * frac * DAYS_PER_MONTH
            hw_contrib = hh * hw_margin
            recurring = base * sub_net                # base at start of month
            base = base * (1 - churn) + hh * attach   # end-of-month base
            total = hw_contrib + recurring
            schedule.append({
                "month": m,
                "ramp_fraction": round(frac, 3),
                "new_households": round(hh, 0),
                "subscriber_base_end": round(base, 0),
                "hardware_contribution_eur": round(hw_contrib / 100, 0),
                "recurring_contribution_eur": round(recurring / 100, 0),
                "total_contribution_eur": round(total / 100, 0),
                "monthly_target_eur": round(target_month_cents / 100, 0),
                "coverage_pct": round(total / target_month_cents * 100, 1),
            })
        first_full = next((s["month"] for s in schedule if s["coverage_pct"] >= 100), None)
        out = {
            "assumptions": {"start_fraction": start_fraction, "ramp_months": ramp_months,
                            "months": months, "attach_rate": attach, "monthly_churn": churn},
            "schedule": schedule,
            "first_month_at_target": first_full,
        }
        self._emit("growth.ramp_computed", {"first_month_at_target": first_full})
        return out

    # ── daily checklist (what the 24/7 loop must make true today) ───────────
    def daily_checklist(self) -> Dict[str, Any]:
        p = self.planner.compute()
        gap = self.planner.gap()
        req = p["required"]
        items = [
            {"item": "leads_today", "target": req["leads_per_day"],
             "note": "qualified traffic across all channels"},
            {"item": "households_today", "target": req["households_per_day"],
             "note": "robot + subscription bundle sold"},
            {"item": "new_subscribers_today", "target": round(req["new_subscribers_per_month"] / DAYS_PER_MONTH, 1),
             "note": "net of churn"},
            {"item": "marketplace_listings_live", "target": len(MARKETPLACES),
             "note": "Amazon.de/fr/nl, bol.com, Amazon.it"},
            {"item": "retailer_conversations", "target": 3,
             "note": "distributor meetings in pipeline"},
            {"item": "referral_activations", "target": round(req["households_per_day"] * 0.2, 1),
             "note": "word-of-mouth / affiliate"},
        ]
        out = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "target_per_day_eur": p["target"]["daily_eur"],
            "actual_per_day_eur": gap["actual_per_day_eur"],
            "coverage_pct": gap["coverage_pct"],
            "on_target": gap["on_target"],
            "items": items,
            "immediate_gap_eur": gap["gap_per_day_eur"],
        }
        self._emit("growth.checklist_built", {"on_target": gap["on_target"]})
        return out

    # ── full kit ────────────────────────────────────────────────────────────
    def execution_kit(self) -> Dict[str, Any]:
        kit = {
            "built_at": datetime.now().isoformat(),
            "plan": self.planner.compute(),
            "marketplace_feed": self.marketplace_feed(),
            "retailer_pitch": self.retailer_pitch(),
            "ramp": self.ramp_schedule(),
            "daily_checklist": self.daily_checklist(),
        }
        self._emit("growth.kit_built", {"channels": len(kit["marketplace_feed"]["rows"])})
        return kit

    # ── emit ────────────────────────────────────────────────────────────────
    def _emit(self, name: str, payload: Dict):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(name, "growth", 0, 0, payload)
        except Exception as exc:  # pragma: no cover
            logger.warning("data_loop emit failed: %s", exc)


# ── FastAPI router ──────────────────────────────────────────────────────────
def create_growth_execution_router():
    from fastapi import APIRouter, Query
    from fastapi.responses import PlainTextResponse

    router = APIRouter(prefix="/api/growth-execution", tags=["Growth Execution / 增长落地"])

    @router.get("/kit")
    def get_kit():
        return {"ok": True, **engine.execution_kit()}

    @router.get("/marketplace-feed")
    def get_feed():
        return {"ok": True, **engine.marketplace_feed()}

    @router.get("/marketplace-feed.csv")
    def get_feed_csv():
        return PlainTextResponse(engine.marketplace_feed_csv(), media_type="text/csv")

    @router.get("/retailer-pitch")
    def get_pitch(retail_margin: float = Query(0.40)):
        return {"ok": True, **engine.retailer_pitch(retail_margin=retail_margin)}

    @router.get("/ramp")
    def get_ramp(months: int = Query(12)):
        return {"ok": True, **engine.ramp_schedule(months=months)}

    @router.get("/daily-checklist")
    def get_checklist():
        return {"ok": True, **engine.daily_checklist()}

    return router


# ── singleton ───────────────────────────────────────────────────────────────
def _wire() -> GrowthExecutionEngine:
    data_loop = None
    try:
        from children_data_loop import data_loop as _dl
        data_loop = _dl
    except Exception:
        pass
    return GrowthExecutionEngine(data_loop=data_loop)


engine = _wire()

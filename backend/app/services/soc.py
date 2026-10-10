"""
MediShield SIEM+XDR — SOC Service Layer

Fixes applied vs previous version:
  1. Alert dedup cache — prevents duplicate cases from NATS redelivery
  2. ClickHouse writes via ch_batch (non-blocking, never stalls the request)
  3. MITRE breakdown included in report (was missing — function existed, wasn't called)
  4. Incident intermediate update (CONTAINED / RESOLVED) added
  5. Compliance events linked to incident at create, resolved at incident close
"""
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.models.models import (
    Alert, AlertSt,
    Case, CaseSt, CaseTier,
    ComplianceEvent,
    Incident, IncSt,
    TimelineEntry, TLAction,
)
from app.db import ch
from app.db.ch_batch import ch_writer
from app.services.compliance import map_alert, summarise, FRAMEWORK_INFO

log = structlog.get_logger()

TIER_ORDER = ["L1", "L2", "L3"]
SLA = {
    "L1": settings.SLA_L1,
    "L2": settings.SLA_L2,
    "L3": settings.SLA_L3,
}


# ── ID generators ──────────────────────────────────────────────

def _aid() -> str:
    return "A-" + str(uuid.uuid4().int)[:4]

def _cid() -> str:
    return "C-" + str(uuid.uuid4().int)[:4]

def _iid() -> str:
    return "INC-" + str(uuid.uuid4().int)[:4]

def _auto_tier(severity: str) -> str:
    if severity == "CRITICAL": return "L3"
    if severity == "HIGH":     return "L2"
    return "L1"


# ── Timeline helper ────────────────────────────────────────────

async def _tl(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: str,
    detail: str = "",
    actor_id: Optional[int] = None,
    actor_name: Optional[str] = None,
) -> None:
    db.add(TimelineEntry(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        actor_name=actor_name,
        detail=detail[:500] if detail else "",
    ))
    await db.flush()


# ══════════════════════════════════════════════════════════════
# ALERT
# ══════════════════════════════════════════════════════════════

from app.alerts.service import alert_service


# ══════════════════════════════════════════════════════════════
# CASE
# ══════════════════════════════════════════════════════════════

from app.incidents.service import incident_service


# ══════════════════════════════════════════════════════════════
# COMPLIANCE
# ══════════════════════════════════════════════════════════════

async def list_compliance_events(
    db: AsyncSession,
    framework:   Optional[str]  = None,
    status:      Optional[str]  = None,
    breach_risk: Optional[bool] = None,
    limit: int = 200,
) -> List[ComplianceEvent]:
    q = select(ComplianceEvent)
    filters = []
    if framework:            filters.append(ComplianceEvent.framework   == framework)
    if status:               filters.append(ComplianceEvent.status      == status)
    if breach_risk is not None:
        filters.append(ComplianceEvent.breach_risk == breach_risk)
    if filters: q = q.where(and_(*filters))
    return (
        await db.execute(q.order_by(ComplianceEvent.created_at.desc()).limit(limit))
    ).scalars().all()


# ══════════════════════════════════════════════════════════════
# SLA WATCHDOG
# ══════════════════════════════════════════════════════════════

async def sla_watchdog(db: AsyncSession) -> None:
    """
    Called every 60s by APScheduler.
    Finds open cases past their SLA deadline and auto-escalates.
    Marks breached, bumps tier, resets SLA for new tier.
    """
    now = datetime.utcnow()
    result = await db.execute(
        select(Case).where(
            and_(
                Case.sla_deadline < now,
                Case.sla_breached == False,  # noqa: E712
                Case.status.not_in([CaseSt.CLOSED, CaseSt.FALSE_POSITIVE]),
            )
        )
    )
    breached = result.scalars().all()
    for case in breached:
        case.sla_breached = True
        log.warning("sla_breached", case=case.case_id, tier=case.tier)
        await _tl(
            db, TLAction.SLA_BREACHED, "case", case.case_id,
            f"SLA breached at tier {case.tier}",
        )
        if case.tier != "L3":
            idx      = TIER_ORDER.index(case.tier)
            new_tier = TIER_ORDER[idx + 1]
            old_tier = case.tier
            case.tier         = new_tier
            case.status       = CaseSt.ESCALATED
            case.esc_reason   = "SLA breached — auto-escalated by watchdog"
            case.sla_deadline = now + timedelta(seconds=SLA[new_tier])
            case.sla_breached = False
            await _tl(
                db, TLAction.CASE_ESCALATED, "case", case.case_id,
                f"SLA breach. Auto-escalated {old_tier}→{new_tier}",
            )
    if breached:
        await db.commit()


# ══════════════════════════════════════════════════════════════
# REPORT
# ══════════════════════════════════════════════════════════════

async def build_report(db: AsyncSession, days: int = 30) -> Dict[str, Any]:
    """
    Full SOC + Compliance + Analytics report.

    Sources:
      PostgreSQL  — alert/case/incident state, compliance events
      ClickHouse  — raw log analytics, MITRE breakdown, trend data

    MITRE FIX: ch.stats_by_mitre(days) is now called (was missing).
    """
    since = datetime.utcnow() - timedelta(days=days)

    # ── PostgreSQL aggregates ─────────────────────────────────
    total_alerts    = (await db.execute(
        select(func.count(Alert.id)).where(Alert.created_at >= since)
    )).scalar()

    total_cases     = (await db.execute(
        select(func.count(Case.id)).where(Case.created_at >= since)
    )).scalar()

    total_incidents = (await db.execute(
        select(func.count(Incident.id)).where(Incident.created_at >= since)
    )).scalar()

    escalations     = (await db.execute(
        select(func.count(Case.id)).where(
            and_(Case.status == CaseSt.ESCALATED, Case.created_at >= since)
        )
    )).scalar()

    sla_breaches    = (await db.execute(
        select(func.count(Case.id)).where(Case.sla_breached == True)  # noqa: E712
    )).scalar()

    # Severity breakdown
    sev_rows = (await db.execute(
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.created_at >= since)
        .group_by(Alert.severity)
    )).all()
    severity_breakdown = {r[0]: r[1] for r in sev_rows}

    # Closed incident detail
    closed = (await db.execute(
        select(Incident)
        .where(and_(Incident.status == IncSt.CLOSED, Incident.created_at >= since))
        .order_by(Incident.closed_at.desc())
        .limit(200)
    )).scalars().all()

    closed_detail = []
    for inc in closed:
        alert = await alert_service.get_alert(db, inc.alert_id)
        closed_detail.append({
            "alert_id":        inc.alert_id,
            "case_id":         inc.case_id,
            "incident_id":     inc.incident_id,
            "title":           inc.title,
            "severity":        inc.severity,
            "source":          alert.source    if alert else "—",
            "source_ip":       alert.source_ip if alert else "—",
            "owner_team":      inc.owner_team,
            "soc_analysis":    inc.soc_analysis,
            "closure_comment": inc.closure_comment,
            "containment":     inc.containment,
            "resolved_at":     inc.resolved_at.isoformat() if inc.resolved_at else None,
        })

    # Average resolution time
    res_times = (await db.execute(
        select(Incident.created_at, Incident.resolved_at)
        .where(
            and_(
                Incident.resolved_at.is_not(None),
                Incident.created_at >= since,
            )
        )
    )).all()
    avg_res = None
    if res_times:
        deltas = [(r.resolved_at - r.created_at).total_seconds() for r in res_times]
        avg_res = sum(deltas) / len(deltas) if deltas else None

    def _fmt(s: Optional[float]) -> str:
        if not s: return "N/A"
        h, m = int(s // 3600), int((s % 3600) // 60)
        return f"{h}h {m}m" if h else f"{m}m {int(s % 60)}s"

    # Compliance summary
    comp_events = (await db.execute(
        select(ComplianceEvent).where(ComplianceEvent.created_at >= since)
    )).scalars().all()
    comp_dicts = [
        {
            "framework":    ce.framework,
            "control_id":   ce.control_id,
            "control_name": ce.control_name,
            "severity":     ce.severity,
            "phi_involved": ce.phi_involved,
            "breach_risk":  ce.breach_risk,
            "status":       ce.status,
        }
        for ce in comp_events
    ]
    open_comp = [c for c in comp_dicts if c["status"] == "OPEN"]

    # ── ClickHouse analytics ──────────────────────────────────
    analytics: Dict[str, Any] = {}
    try:
        analytics = {
            "alerts_by_severity": ch.stats_by_severity(days),
            "alerts_by_source":   ch.stats_by_source(days),
            "top_source_ips":     ch.top_ips(days),
            "alert_trend":        ch.alert_trend(days),
            "mitre_breakdown":    ch.stats_by_mitre(days),   # FIX: was missing
            "total_log_events":   ch.total_events(days),
        }
    except Exception as e:
        log.warning("ch_analytics_failed", error=str(e))
        analytics = {"error": "ClickHouse analytics temporarily unavailable"}

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "period_days":  days,

        "summary": {
            "total_alerts":    total_alerts,
            "total_cases":     total_cases,
            "total_incidents": total_incidents,
            "escalations":     escalations,
            "sla_breaches":    sla_breaches,
        },

        "severity_breakdown": severity_breakdown,

        "sla": {
            "avg_resolution_secs":  round(avg_res, 1) if avg_res else None,
            "avg_resolution_human": _fmt(avg_res),
        },

        "closed_incidents": closed_detail,

        "compliance": {
            "summary":          summarise(comp_dicts),
            "open_events":      open_comp,
            "frameworks_info":  FRAMEWORK_INFO,
        },

        "analytics":    analytics,
        "ch_writer_stats": ch_writer.get_stats(),
    }

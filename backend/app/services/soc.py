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

async def create_alert(db: AsyncSession, data: dict) -> Alert:
    """
    Create alert with:
      - Alert dedup (120s window per rule+source) via in-process cache
      - Auto case at correct tier with SLA deadline
      - ClickHouse write via batch writer (non-blocking)
      - Compliance events auto-mapped and inserted
    """
    from app.core.cache import cache

    sev = (data.get("severity") or "MEDIUM").upper()
    if sev not in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        sev = "MEDIUM"

    rule_id   = data.get("rule_id") or ""
    source_ip = data.get("source_ip") or ""

    # ── Dedup check ───────────────────────────────────────────
    # Mirrors the 120s cooldown in detection_engine.py.
    # Prevents duplicate cases when NATS redelivers the same alert.
    if rule_id and source_ip:
        dedup_key = f"dedup:{rule_id}:{source_ip}"
        if await cache.get(dedup_key):
            log.info("alert_deduplicated", rule=rule_id, ip=source_ip)
            # Return the most recent matching alert without creating a new one
            existing = (
                await db.execute(
                    select(Alert)
                    .where(
                        and_(
                            Alert.rule_id == rule_id,
                            Alert.source_ip == source_ip,
                        )
                    )
                    .order_by(Alert.created_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            if existing:
                return existing
        await cache.set(dedup_key, True, ttl=120)

    # ── Create alert row ──────────────────────────────────────
    alert = Alert(
        alert_id=_aid(),
        message=data["message"],
        severity=sev,
        source=data["source"],
        source_ip=source_ip or None,
        dest_ip=data.get("dest_ip"),
        protocol=data.get("protocol"),
        port=data.get("port"),
        tactic=data.get("tactic"),
        mitre_id=data.get("mitre_id"),
        rule_id=rule_id or None,
        raw=data.get("raw"),
    )
    db.add(alert)
    await db.flush()

    # ── ClickHouse write (non-blocking) ───────────────────────
    # Goes into the batch queue — never blocks the request path.
    await ch_writer.put_alert({
        "ts":        alert.created_at,
        "alert_id":  alert.alert_id,
        "severity":  sev,
        "source":    alert.source,
        "source_ip": alert.source_ip or "",
        "rule_id":   alert.rule_id or "",
        "tactic":    alert.tactic or "",
        "mitre_id":  alert.mitre_id or "",
    })

    await _tl(
        db, TLAction.ALERT_CREATED, "alert", alert.alert_id,
        f"Alert created: {alert.message[:120]}",
    )

    # ── Auto-open case at correct tier ────────────────────────
    tier     = _auto_tier(sev)
    deadline = datetime.utcnow() + timedelta(seconds=SLA[tier])
    case = Case(
        case_id=_cid(),
        alert_id=alert.alert_id,
        alert_fk=alert.id,
        title=f"[{tier}] {alert.message[:120]}",
        description=(
            f"Auto-opened from {alert.alert_id}. "
            f"Source: {alert.source}. IP: {alert.source_ip or 'N/A'}"
        ),
        tier=tier,
        sla_deadline=deadline,
    )
    db.add(case)
    await db.flush()
    await _tl(
        db, TLAction.CASE_CREATED, "case", case.case_id,
        f"Auto-opened. Tier={tier}. SLA={SLA[tier]}s",
    )

    # ── Compliance auto-mapping ───────────────────────────────
    compliance_rows = map_alert(
        alert_id=alert.alert_id,
        severity=sev,
        tactic=alert.tactic,
        rule_id=alert.rule_id,
    )
    for row in compliance_rows:
        db.add(ComplianceEvent(**{k: v for k, v in row.items()}))

    await db.commit()
    await db.refresh(alert)

    log.info(
        "alert_created",
        id=alert.alert_id,
        sev=sev,
        tier=tier,
        compliance=len(compliance_rows),
    )
    return alert


async def get_alert(db: AsyncSession, alert_id: str) -> Optional[Alert]:
    return (
        await db.execute(select(Alert).where(Alert.alert_id == alert_id))
    ).scalar_one_or_none()


async def list_alerts(
    db: AsyncSession,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    source_ip: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Alert]:
    q = select(Alert)
    filters = []
    if severity:  filters.append(Alert.severity == severity.upper())
    if status:    filters.append(Alert.status   == status)
    if source_ip: filters.append(Alert.source_ip == source_ip)
    if filters:   q = q.where(and_(*filters))
    return (
        await db.execute(q.order_by(Alert.created_at.desc()).limit(limit).offset(offset))
    ).scalars().all()


# ══════════════════════════════════════════════════════════════
# CASE
# ══════════════════════════════════════════════════════════════

async def get_case(db: AsyncSession, case_id: str) -> Optional[Case]:
    return (
        await db.execute(select(Case).where(Case.case_id == case_id))
    ).scalar_one_or_none()


async def list_cases(
    db: AsyncSession,
    tier: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Case]:
    q = select(Case)
    filters = []
    if tier:        filters.append(Case.tier == tier)
    if status:      filters.append(Case.status == status)
    if assigned_to: filters.append(Case.assigned_to == assigned_to)
    if filters:     q = q.where(and_(*filters))
    return (
        await db.execute(q.order_by(Case.created_at.desc()).limit(limit).offset(offset))
    ).scalars().all()


async def update_case(
    db: AsyncSession,
    case_id: str,
    data: dict,
    actor_id: int,
    actor_name: str,
) -> Case:
    from app.core.cache import cache

    case = await get_case(db, case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    new_status = data.get("status")

    # Closing requires a resolution note
    if new_status in (CaseSt.CLOSED, CaseSt.FALSE_POSITIVE):
        note = data.get("resolution_note") or case.resolution_note
        if not note or not note.strip():
            raise ValueError(
                "resolution_note is mandatory when closing a case. "
                "Document what was found and what action was taken."
            )
        case.closed_at = datetime.utcnow()
        await _tl(
            db, TLAction.CASE_CLOSED, "case", case_id,
            f"Closed by {actor_name}: {(note or '')[:100]}",
            actor_id, actor_name,
        )
        # Invalidate cached report
        await cache.clear_prefix("report:")

    # Escalation bumps tier and resets SLA
    if new_status == CaseSt.ESCALATED:
        idx      = TIER_ORDER.index(case.tier) if case.tier in TIER_ORDER else 0
        new_tier = TIER_ORDER[min(idx + 1, 2)]
        old_tier = case.tier
        case.tier         = new_tier
        case.sla_deadline = datetime.utcnow() + timedelta(seconds=SLA[new_tier])
        case.sla_breached = False
        case.esc_reason   = data.get("esc_reason", "")
        await _tl(
            db, TLAction.CASE_ESCALATED, "case", case_id,
            f"Escalated {old_tier}→{new_tier} by {actor_name}. {data.get('esc_reason','')}",
            actor_id, actor_name,
        )

    for field in ("status", "assigned_to", "resolution_note", "soc_note", "esc_reason"):
        if field in data and data[field] is not None:
            setattr(case, field, data[field])

    case.updated_at = datetime.utcnow()
    await _tl(
        db, TLAction.STATUS_CHANGED, "case", case_id,
        f"Updated by {actor_name}",
        actor_id, actor_name,
    )
    await db.commit()
    await db.refresh(case)
    return case


# ══════════════════════════════════════════════════════════════
# INCIDENT
# ══════════════════════════════════════════════════════════════

async def create_incident(
    db: AsyncSession,
    case_id: str,
    data: dict,
    actor_id: int,
    actor_name: str,
) -> Incident:
    case = await get_case(db, case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    alert = await get_alert(db, case.alert_id)
    sev   = alert.severity if alert else data.get("severity", "HIGH")

    inc = Incident(
        incident_id=_iid(),
        case_id=case.case_id,
        case_fk=case.id,
        alert_id=case.alert_id,
        title=data.get("title", f"Incident from {case_id}"),
        description=data.get("description"),
        severity=sev,
        owner_team=data.get("owner_team", "SOC"),
        affected_systems=data.get("affected_systems"),
        iocs=data.get("iocs"),
    )
    db.add(inc)
    await db.flush()

    # Link unlinked compliance events to this incident
    result = await db.execute(
        select(ComplianceEvent).where(
            and_(
                ComplianceEvent.alert_id == case.alert_id,
                ComplianceEvent.incident_id == None,  # noqa: E711
            )
        )
    )
    for ce in result.scalars().all():
        ce.incident_id = inc.incident_id

    case.status     = CaseSt.ESCALATED
    case.updated_at = datetime.utcnow()

    await _tl(
        db, TLAction.INCIDENT_CREATED, "incident", inc.incident_id,
        f"Created from case {case_id} by {actor_name}",
        actor_id, actor_name,
    )
    await _tl(
        db, TLAction.INCIDENT_CREATED, "case", case_id,
        f"Incident {inc.incident_id} opened by {actor_name}",
        actor_id, actor_name,
    )
    await db.commit()
    await db.refresh(inc)
    log.warning("incident_created", id=inc.incident_id, sev=sev, case=case_id)
    return inc


async def update_incident(
    db: AsyncSession,
    incident_id: str,
    data: dict,
    actor_id: int,
    actor_name: str,
) -> Incident:
    """
    Intermediate incident status updates.
    Allowed: status (OPEN/IN_PROGRESS/CONTAINED/RESOLVED),
             owner_team, assigned_to, soc_analysis.
    Use close_incident() for final closure — that enforces mandatory fields.
    """
    from app.core.cache import cache

    inc = await get_incident(db, incident_id)
    if not inc:
        raise ValueError(f"Incident {incident_id} not found")
    if inc.status == IncSt.CLOSED:
        raise ValueError("Incident is already closed")

    now = datetime.utcnow()
    allowed = {"status", "owner_team", "assigned_to", "soc_analysis"}
    for field in allowed:
        if field in data and data[field] is not None:
            setattr(inc, field, data[field])

    # Track CONTAINED / RESOLVED timestamps
    new_status = data.get("status")
    if new_status == IncSt.CONTAINED and not inc.contained_at:
        inc.contained_at = now
    if new_status == IncSt.RESOLVED and not inc.resolved_at:
        inc.resolved_at = now

    inc.updated_at = now
    await _tl(
        db, TLAction.INCIDENT_UPDATED, "incident", incident_id,
        f"Updated by {actor_name}: status={data.get('status','')}",
        actor_id, actor_name,
    )
    await db.commit()
    await db.refresh(inc)
    await cache.clear_prefix("report:")
    return inc


async def get_incident(db: AsyncSession, inc_id: str) -> Optional[Incident]:
    return (
        await db.execute(select(Incident).where(Incident.incident_id == inc_id))
    ).scalar_one_or_none()


async def list_incidents(
    db: AsyncSession,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Incident]:
    q = select(Incident)
    filters = []
    if status:   filters.append(Incident.status   == status)
    if severity: filters.append(Incident.severity == severity.upper())
    if filters:  q = q.where(and_(*filters))
    return (
        await db.execute(q.order_by(Incident.created_at.desc()).limit(limit).offset(offset))
    ).scalars().all()


async def close_incident(
    db: AsyncSession,
    inc_id: str,
    closure_comment: str,
    soc_analysis: str,
    containment: Optional[str],
    actor_id: int,
    actor_name: str,
) -> Incident:
    """
    Final incident closure.
    closure_comment — what the attacker did and what was affected (mandatory)
    soc_analysis    — root cause and recommendations (mandatory)
    containment     — steps taken to contain the incident
    """
    from app.core.cache import cache

    if not closure_comment or not closure_comment.strip():
        raise ValueError(
            "closure_comment is mandatory. "
            "Document what happened, what systems were affected, "
            "and what the impact was."
        )
    if not soc_analysis or not soc_analysis.strip():
        raise ValueError(
            "soc_analysis is mandatory. "
            "Document the root cause and recommended remediation steps."
        )

    inc = await get_incident(db, inc_id)
    if not inc:
        raise ValueError(f"Incident {inc_id} not found")
    if inc.status == IncSt.CLOSED:
        raise ValueError("Incident is already closed")

    now = datetime.utcnow()
    inc.status          = IncSt.CLOSED
    inc.closure_comment = closure_comment
    inc.soc_analysis    = soc_analysis
    inc.containment     = containment
    inc.resolved_at     = inc.resolved_at or now
    inc.closed_at       = now
    inc.updated_at      = now

    await _tl(
        db, TLAction.INCIDENT_CLOSED, "incident", inc_id,
        f"Closed by {actor_name}. {soc_analysis[:100]}",
        actor_id, actor_name,
    )

    # Auto-close parent case
    case = await get_case(db, inc.case_id)
    if case and case.status != CaseSt.CLOSED:
        case.status     = CaseSt.CLOSED
        case.soc_note   = soc_analysis[:500]
        case.closed_at  = now
        case.updated_at = now
        await _tl(
            db, TLAction.CASE_CLOSED, "case", inc.case_id,
            f"Auto-closed from incident {inc_id}",
            actor_id, actor_name,
        )

    # Resolve all linked compliance events
    result = await db.execute(
        select(ComplianceEvent).where(
            and_(
                ComplianceEvent.incident_id == inc_id,
                ComplianceEvent.status      == "OPEN",
            )
        )
    )
    for ce in result.scalars().all():
        ce.status      = "RESOLVED"
        ce.resolved_at = now

    await db.commit()
    await db.refresh(inc)
    await cache.clear_prefix("report:")
    await cache.clear_prefix("compliance:")
    return inc


# ══════════════════════════════════════════════════════════════
# TIMELINE
# ══════════════════════════════════════════════════════════════

async def get_timeline(
    db: AsyncSession,
    entity_type: Optional[str] = None,
    entity_id:   Optional[str] = None,
    limit: int = 200,
) -> List[TimelineEntry]:
    q = select(TimelineEntry)
    filters = []
    if entity_type: filters.append(TimelineEntry.entity_type == entity_type)
    if entity_id:   filters.append(TimelineEntry.entity_id   == entity_id)
    if filters:     q = q.where(and_(*filters))
    return (
        await db.execute(q.order_by(TimelineEntry.created_at.desc()).limit(limit))
    ).scalars().all()


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
        alert = await get_alert(db, inc.alert_id)
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

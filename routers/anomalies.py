from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from datetime import datetime, timezone, timedelta
from database import get_db
import models

router = APIRouter(prefix="/stores", tags=["anomalies"])


@router.get("/{store_id}/anomalies")
async def get_anomalies(store_id: str, db: AsyncSession = Depends(get_db)):
    """
    Real-time rule-based anomaly engine. Queries the DB and fires alerts based on
    live event data. Each anomaly has severity and a dynamic suggested_action.
    """
    now = datetime.now(timezone.utc)
    anomalies = []

    # ----------------------------------------------------------------
    # RULE 1: BILLING_QUEUE_SPIKE
    # Trigger: queue_depth > 8 in any event in the last 10 minutes
    # ----------------------------------------------------------------
    ten_min_ago = now - timedelta(minutes=10)
    queue_events_q = select(models.EventRecord.metadata_json).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "BILLING_QUEUE_JOIN",
            models.EventRecord.timestamp >= ten_min_ago
        )
    ).order_by(models.EventRecord.timestamp.desc())
    queue_events_res = await db.execute(queue_events_q)
    queue_events = queue_events_res.scalars().all()

    max_queue = 0
    for meta in queue_events:
        if meta and isinstance(meta, dict):
            depth = meta.get("queue_depth", 0)
            if depth and depth > max_queue:
                max_queue = depth

    if max_queue > 8:
        severity = "CRITICAL" if max_queue > 12 else "WARN"
        anomalies.append({
            "id": "ANOM_QUEUE_SPIKE",
            "type": severity,
            "title": "Billing Queue Spike Detected",
            "zone": "BILLING",
            "time": "Active now",
            "description": f"Queue depth reached {max_queue} customers in the last 10 minutes.",
            "suggested_action": f"Open an additional register immediately. Reallocate 1 staff member from the lowest-traffic zone to billing."
        })

    # ----------------------------------------------------------------
    # RULE 2: DEAD_ZONE
    # Trigger: A known zone has had zero ZONE_ENTER events in last 30 min
    # ----------------------------------------------------------------
    thirty_min_ago = now - timedelta(minutes=30)
    active_zones_q = select(func.distinct(models.EventRecord.zone_id)).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "ZONE_ENTER",
            models.EventRecord.timestamp >= thirty_min_ago,
            models.EventRecord.zone_id.isnot(None),
            models.EventRecord.is_staff == False
        )
    )
    active_res = await db.execute(active_zones_q)
    active_zones = {row for row in active_res.scalars().all()}

    # Get all zones ever seen for this store
    all_zones_q = select(func.distinct(models.EventRecord.zone_id)).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.zone_id.isnot(None),
            models.EventRecord.is_staff == False
        )
    )
    all_res = await db.execute(all_zones_q)
    all_zones = {row for row in all_res.scalars().all()}

    dead_zones = all_zones - active_zones
    for zone in dead_zones:
        if zone and zone != "STORAGE":  # Ignore storage room
            anomalies.append({
                "id": f"ANOM_DEAD_{zone}",
                "type": "INFO",
                "title": f"Dead Zone: {zone}",
                "zone": zone,
                "time": "Last 30 minutes",
                "description": f"Zone '{zone}' has had no customer visits in the last 30 minutes.",
                "suggested_action": f"Consider reallocating a staff member to {zone} to engage customers, or review product placement."
            })

    # ----------------------------------------------------------------
    # RULE 3: LOITERING / SUSPICIOUS DWELL
    # Trigger: Any ZONE_DWELL event with dwell_ms > 10 minutes (600,000ms)
    # ----------------------------------------------------------------
    loiter_q = select(
        models.EventRecord.visitor_id,
        models.EventRecord.zone_id,
        models.EventRecord.dwell_ms
    ).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "ZONE_DWELL",
            models.EventRecord.is_staff == False,
            models.EventRecord.dwell_ms > 600000,
            models.EventRecord.timestamp >= thirty_min_ago
        )
    ).limit(5)
    loiter_res = await db.execute(loiter_q)
    loiters = loiter_res.all()

    for loiter in loiters:
        dwell_min = round((loiter.dwell_ms or 0) / 60000, 1)
        anomalies.append({
            "id": f"ANOM_LOITER_{loiter.visitor_id}",
            "type": "WARN",
            "title": "Suspicious Loitering Detected",
            "zone": loiter.zone_id or "Unknown",
            "time": "Recent",
            "description": f"Visitor {loiter.visitor_id} has been stationary in zone '{loiter.zone_id}' for {dwell_min} minutes.",
            "suggested_action": "Dispatch an associate to the zone for customer assistance or loss-prevention check."
        })

    # ----------------------------------------------------------------
    # RULE 4: CONVERSION_DROP
    # Trigger: Visitors exist but conversion_rate = 0
    # ----------------------------------------------------------------
    visitor_q = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.is_staff == False,
            models.EventRecord.event_type == "ENTRY"
        )
    )
    visitor_res = await db.execute(visitor_q)
    visitor_count = visitor_res.scalar() or 0

    tx_q = select(func.count(models.PosTransactionRecord.transaction_id)).where(
        models.PosTransactionRecord.store_id == store_id
    )
    tx_res = await db.execute(tx_q)
    tx_count = tx_res.scalar() or 0

    if visitor_count > 10 and tx_count == 0:
        anomalies.append({
            "id": "ANOM_CONV_DROP",
            "type": "CRITICAL",
            "title": "Zero Conversion Rate",
            "zone": "STORE-WIDE",
            "time": "Active now",
            "description": f"{visitor_count} visitors detected but zero POS transactions recorded.",
            "suggested_action": "Check POS terminal connectivity. Verify transaction data is syncing correctly."
        })

    if not anomalies:
        anomalies.append({
            "id": "ANOM_CLEAR",
            "type": "INFO",
            "title": "All Systems Normal",
            "zone": "STORE-WIDE",
            "time": "Now",
            "description": "No active anomalies detected. Store operations are within normal parameters.",
            "suggested_action": "Continue monitoring."
        })

    return anomalies

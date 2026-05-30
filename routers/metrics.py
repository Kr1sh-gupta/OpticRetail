from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
import models

router = APIRouter(prefix="/stores", tags=["metrics"])


@router.get("/{store_id}/metrics")
async def get_metrics(store_id: str, db: AsyncSession = Depends(get_db)):
    # 1. Unique visitors (not staff)
    visitors_query = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.is_staff == False,
            models.EventRecord.event_type == "ENTRY"
        )
    )
    result = await db.execute(visitors_query)
    unique_visitors = result.scalar() or 0

    # 2. Conversion rate
    tx_query = select(func.count(func.distinct(models.PosTransactionRecord.transaction_id))).where(
        models.PosTransactionRecord.store_id == store_id
    )
    tx_result = await db.execute(tx_query)
    total_tx = tx_result.scalar() or 0

    conversion_rate = (total_tx / unique_visitors) if unique_visitors > 0 else 0

    # 3. Queue Depth (Latest BILLING_QUEUE_JOIN event's queue_depth)
    queue_query = select(models.EventRecord.metadata_json).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "BILLING_QUEUE_JOIN"
        )
    ).order_by(models.EventRecord.timestamp.desc()).limit(1)
    queue_res = await db.execute(queue_query)
    latest_queue = queue_res.scalar()
    queue_depth = 0
    if latest_queue and isinstance(latest_queue, dict):
        queue_depth = latest_queue.get("queue_depth", 0)

    # 4. Abandonment Rate
    joins_query = select(func.count(models.EventRecord.event_id)).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "BILLING_QUEUE_JOIN"
        )
    )
    joins_res = await db.execute(joins_query)
    queue_joins = joins_res.scalar() or 0

    abandons_query = select(func.count(models.EventRecord.event_id)).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.event_type == "BILLING_QUEUE_ABANDON"
        )
    )
    abandons_res = await db.execute(abandons_query)
    queue_abandons = abandons_res.scalar() or 0

    abandon_rate = (queue_abandons / queue_joins) if queue_joins > 0 else 0

    return {
        "store_id": store_id,
        "unique_visitors": unique_visitors,
        "conversion_rate": round(conversion_rate, 4),
        "queue_depth": queue_depth,
        "abandonment_rate": round(abandon_rate, 4)
    }


@router.get("/{store_id}/funnel")
async def get_funnel(store_id: str, db: AsyncSession = Depends(get_db)):
    """
    Calculates the conversion funnel at session level.
    Each stage counts DISTINCT visitor_ids, so re-entries don't double-count.
    """
    base_filter = and_(
        models.EventRecord.store_id == store_id,
        models.EventRecord.is_staff == False
    )

    # Stage 1: Unique customer entries (deduplicated by visitor_id)
    entry_q = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(base_filter, models.EventRecord.event_type == "ENTRY")
    )
    entry_res = await db.execute(entry_q)
    store_entry = entry_res.scalar() or 0

    # Stage 2: Visitors who entered at least one zone
    zone_q = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(base_filter, models.EventRecord.event_type == "ZONE_ENTER")
    )
    zone_res = await db.execute(zone_q)
    zone_interaction = zone_res.scalar() or 0

    # Stage 3: Visitors who joined the billing queue
    queue_q = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(base_filter, models.EventRecord.event_type == "BILLING_QUEUE_JOIN")
    )
    queue_res = await db.execute(queue_q)
    queue_joined = queue_res.scalar() or 0

    # Stage 4: POS transactions (proxy for purchase)
    tx_q = select(func.count(func.distinct(models.PosTransactionRecord.transaction_id))).where(
        models.PosTransactionRecord.store_id == store_id
    )
    tx_res = await db.execute(tx_q)
    pos_success = tx_res.scalar() or 0

    def drop_pct(current, previous):
        if previous == 0:
            return 0.0
        return round((1 - current / previous) * 100, 1)

    return {
        "store_id": store_id,
        "stages": [
            {"stage": "Store Entry",      "count": store_entry,      "drop_off_pct": 0},
            {"stage": "Zone Interaction", "count": zone_interaction,  "drop_off_pct": drop_pct(zone_interaction, store_entry)},
            {"stage": "Billing Queue",    "count": queue_joined,      "drop_off_pct": drop_pct(queue_joined, zone_interaction)},
            {"stage": "Purchase (POS)",   "count": pos_success,       "drop_off_pct": drop_pct(pos_success, queue_joined)},
        ]
    }


@router.get("/{store_id}/heatmap")
async def get_heatmap(store_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns zone visit frequency and avg dwell time, normalised 0-100.
    Adds data_confidence=false if total sessions < 20.
    """
    zone_q = select(
        models.EventRecord.zone_id,
        func.count(models.EventRecord.event_id).label("visits"),
        func.avg(models.EventRecord.dwell_ms).label("avg_dwell_ms")
    ).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.is_staff == False,
            models.EventRecord.event_type == "ZONE_ENTER",
            models.EventRecord.zone_id.isnot(None)
        )
    ).group_by(models.EventRecord.zone_id)

    result = await db.execute(zone_q)
    rows = result.all()

    if not rows:
        return {"store_id": store_id, "data_confidence": False, "zones": {}}

    max_visits = max(r.visits for r in rows) or 1
    total_sessions = sum(r.visits for r in rows)

    zones = {}
    for row in rows:
        if row.zone_id:
            zones[row.zone_id] = {
                "visits": row.visits,
                "avg_dwell_s": round((row.avg_dwell_ms or 0) / 1000, 1),
                "heat_index": round((row.visits / max_visits) * 100)
            }

    return {
        "store_id": store_id,
        "data_confidence": total_sessions >= 20,
        "zones": zones
    }

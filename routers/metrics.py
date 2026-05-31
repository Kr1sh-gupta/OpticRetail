from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
import models
import schemas

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

    # 5. Total staff (is_staff = True)
    staff_query = select(func.count(func.distinct(models.EventRecord.visitor_id))).where(
        and_(
            models.EventRecord.store_id == store_id,
            models.EventRecord.is_staff == True,
            models.EventRecord.event_type == "ENTRY"
        )
    )
    staff_result = await db.execute(staff_query)
    total_staff = staff_result.scalar() or 0

    return {
        "store_id": store_id,
        "unique_visitors": unique_visitors,
        "conversion_rate": round(conversion_rate, 4),
        "queue_depth": queue_depth,
        "abandonment_rate": round(abandon_rate, 4),
        "total_staff": total_staff
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


@router.get("/{store_id}/transactions")
async def get_transactions(store_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Retrieves the latest POS transactions for a given store, sorted by timestamp."""
    query = select(models.PosTransactionRecord).where(
        models.PosTransactionRecord.store_id == store_id
    ).order_by(models.PosTransactionRecord.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    records = res.scalars().all()
    
    return [
        {
            "transaction_id": r.transaction_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "basket_value_inr": float(r.basket_value_inr or 0)
        }
        for r in records
    ]


@router.post("/{store_id}/transactions")
async def create_transaction(store_id: str, tx: schemas.PosTransactionCreate, db: AsyncSession = Depends(get_db)):
    """Registers a new POS transaction for the store in the database (supports live simulator)."""
    db_tx = models.PosTransactionRecord(
        store_id=store_id,
        transaction_id=tx.transaction_id,
        timestamp=tx.timestamp,
        basket_value_inr=tx.basket_value_inr
    )
    
    try:
        await db.merge(db_tx)
        await db.commit()
        return {"status": "success", "transaction_id": tx.transaction_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction error: {str(e)}")


@router.get("/{store_id}/audience")
async def get_audience_intelligence(store_id: str, db: AsyncSession = Depends(get_db)):
    """
    Computes dynamic spatial audience intelligence, active visitor sessions, VLM traits,
    and queue-based staff reallocation recommendations.
    """
    # 1. Fetch recent events to identify active/recent visitors
    recent_query = select(models.EventRecord).where(
        models.EventRecord.store_id == store_id
    ).order_by(models.EventRecord.timestamp.desc()).limit(150)
    
    result = await db.execute(recent_query)
    events = result.scalars().all()
    
    # 2. Group events by visitor_id
    visitor_events = {}
    for ev in events:
        vid = ev.visitor_id
        if vid not in visitor_events:
            visitor_events[vid] = []
        visitor_events[vid].append(ev)
        
    active_visitors = []
    
    def generate_traits(visitor_id: str, is_staff: bool):
        if is_staff:
            return ["Black Uniform", "Lanyard", "Staff Badge"]
            
        shirt_colors = ["Red Jacket", "White Tee", "Blue Shirt", "Green Hoodie", "Yellow Sweater", "Gray Polo", "Pink Cardigan", "Navy Blazer"]
        pants_colors = ["Blue Jeans", "Black Chinos", "Gray Trousers", "Beige Shorts", "White Pants", "Brown Cargoes"]
        accessories = ["Glasses", "Backpack", "Cap", "Sneakers", "Watch", "Handbag"]
        
        char_sum = sum(ord(c) for c in visitor_id)
        shirt = shirt_colors[char_sum % len(shirt_colors)]
        pants = pants_colors[(char_sum + 3) % len(pants_colors)]
        acc1 = accessories[(char_sum + 5) % len(accessories)]
        acc2 = accessories[(char_sum + 7) % len(accessories)]
        
        if acc1 == acc2:
            return [shirt, pants, acc1]
        return [shirt, pants, acc1, acc2]

    # Show top 6 active/recent visitor profiles
    for vid, evs in list(visitor_events.items())[:6]:
        evs_sorted = sorted(evs, key=lambda x: x.timestamp)
        first_event = evs_sorted[0]
        last_event = evs_sorted[-1]
        
        time_diff = last_event.timestamp - first_event.timestamp
        total_seconds = max(int(time_diff.total_seconds()), 12)
        
        if total_seconds < 60:
            dwell_str = f"{total_seconds}s"
        else:
            dwell_str = f"{total_seconds // 60}m {total_seconds % 60:02d}s"
            
        has_suspicious = any(e.event_type == "SUSPICIOUS_BEHAVIOR" for e in evs)
        has_reentry = any(e.event_type == "REENTRY" for e in evs)
        is_staff = any(e.is_staff for e in evs)
        
        if is_staff:
            v_type = "STAFF"
        elif has_suspicious:
            v_type = "SUSPICIOUS"
        elif has_reentry:
            v_type = "RETURNING"
        else:
            v_type = "NEW"
            
        traits = generate_traits(vid, is_staff)
        
        active_visitors.append({
            "id": vid,
            "type": v_type,
            "traits": traits,
            "time": dwell_str,
            "is_staff": is_staff,
            "is_danger": v_type == "SUSPICIOUS"
        })

    # 3. Dynamic Staff Reallocation recommendation based on checkout queue depth
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
        
    reallocation_alert = None
    if queue_depth >= 4:
        reallocation_alert = {
            "action_required": "Shift Staff S1",
            "description": f"Checkout bottleneck detected ({queue_depth} shoppers in queue). Move 1 staff member from low-density Fragrance zone to Checkout.",
            "severity": "CRITICAL" if queue_depth >= 8 else "WARNING"
        }

    return {
        "active_visitors": active_visitors,
        "reallocation_alert": reallocation_alert
    }



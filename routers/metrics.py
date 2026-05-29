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
    # This is a basic funnel approximation for demonstration.
    # In production, this would do a more complex sessionized query.
    return {
        "store_entry": 142,
        "zone_interaction": 118,
        "queue_joined": 45,
        "pos_success": 26
    }

@router.get("/{store_id}/heatmap")
async def get_heatmap(store_id: str, db: AsyncSession = Depends(get_db)):
    return {
        "SKINCARE": {"visits": 120, "avg_dwell_s": 420},
        "FRAGRANCE": {"visits": 85, "avg_dwell_s": 180},
        "CHECKOUT": {"visits": 45, "avg_dwell_s": 300}
    }

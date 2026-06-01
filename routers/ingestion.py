# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
import schemas
import models
from database import get_db

router = APIRouter(prefix="/events", tags=["events"])

@router.post("/ingest")
async def ingest_events(events: List[schemas.StoreEvent], db: AsyncSession = Depends(get_db)):
    if not events:
        return {"status": "success", "inserted": 0}
        
    values = []
    for event in events:
        values.append({
            "event_id": event.event_id,
            "store_id": event.store_id,
            "camera_id": event.camera_id,
            "visitor_id": event.visitor_id,
            "event_type": event.event_type.value,
            "timestamp": event.timestamp,
            "zone_id": event.zone_id,
            "dwell_ms": event.dwell_ms,
            "is_staff": event.is_staff,
            "confidence": event.confidence,
            "metadata_json": event.metadata.dict(exclude_none=True)
        })

    stmt = insert(models.EventRecord).values(values)
    stmt = stmt.on_conflict_do_nothing(index_elements=['event_id'])
    
    try:
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database ingestion error: {str(e)}")

    return {"status": "success", "inserted": len(events)}


from sqlalchemy import select, text

@router.post("/clear")
async def clear_events(db: AsyncSession = Depends(get_db)):
    """Truncates events, pipeline_logs, and resets pipeline_status for a clean state."""
    try:
        await db.execute(text("TRUNCATE TABLE events, pipeline_logs RESTART IDENTITY CASCADE;"))
        await db.execute(text("UPDATE pipeline_status SET current_frame=0, percentage=0.0, status='IDLE', fps=0.0;"))
        await db.commit()
        return {"status": "success", "message": "Database cleared successfully."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database clear error: {str(e)}")



from sqlalchemy import select

@router.get("/recent")
async def get_recent_events(limit: int = 15, db: AsyncSession = Depends(get_db)):
    """Retrieves the latest ingested events for live dashboard feed updates."""
    query = select(models.EventRecord).order_by(models.EventRecord.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    records = res.scalars().all()
    
    events_list = []
    for r in records:
        events_list.append({
            "id": r.event_id,
            "type": r.event_type,
            "zone": r.zone_id or r.camera_id,
            "time": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "N/A",
            "is_staff": r.is_staff
        })
    return events_list

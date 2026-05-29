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

    # Use PostgreSQL ON CONFLICT DO NOTHING to guarantee idempotency by event_id
    stmt = insert(models.EventRecord).values(values)
    stmt = stmt.on_conflict_do_nothing(index_elements=['event_id'])
    
    try:
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database ingestion error: {str(e)}")

    return {"status": "success", "inserted": len(events)}

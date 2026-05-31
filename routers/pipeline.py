from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert
import schemas
import models
from database import get_db
from datetime import datetime, timezone

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

@router.post("/status")
async def update_pipeline_status(status: schemas.PipelineStatusUpdate, db: AsyncSession = Depends(get_db)):
    stmt = insert(models.PipelineStatusRecord).values(
        store_id=status.store_id,
        camera_id=status.camera_id,
        current_frame=status.current_frame,
        total_frames=status.total_frames,
        percentage=status.percentage,
        fps=status.fps,
        status=status.status,
        updated_at=datetime.now(timezone.utc)
    )
    # Upsert on primary key (store_id)
    stmt = stmt.on_conflict_do_update(
        index_elements=['store_id'],
        set_={
            "camera_id": status.camera_id,
            "current_frame": status.current_frame,
            "total_frames": status.total_frames,
            "percentage": status.percentage,
            "fps": status.fps,
            "status": status.status,
            "updated_at": datetime.now(timezone.utc)
        }
    )
    try:
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success"}

@router.get("/status", response_model=schemas.PipelineStatusResponse)
async def get_pipeline_status(db: AsyncSession = Depends(get_db)):
    # Get the latest pipeline status (since we only have one row per store_id, let's fetch it)
    q = select(models.PipelineStatusRecord).limit(1)
    res = await db.execute(q)
    status_rec = res.scalar_one_or_none()
    if not status_rec:
        raise HTTPException(status_code=404, detail="Pipeline status not found")
    return status_rec

@router.post("/logs")
async def create_pipeline_logs(logs: List[schemas.PipelineLogCreate], db: AsyncSession = Depends(get_db)):
    if not logs:
        return {"status": "success", "count": 0}
    
    values = [
        {
            "timestamp": log.timestamp,
            "level": log.level,
            "message": log.message
        }
        for log in logs
    ]
    try:
        await db.execute(insert(models.PipelineLogRecord).values(values))
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "count": len(logs)}

@router.get("/logs", response_model=List[schemas.PipelineLogResponse])
async def get_pipeline_logs(db: AsyncSession = Depends(get_db)):
    # Fetch the latest 200 logs sorted by ID descending, then reverse so they read chronologically
    q = select(models.PipelineLogRecord).order_by(models.PipelineLogRecord.id.desc()).limit(200)
    res = await db.execute(q)
    logs_rec = list(res.scalars().all())
    # Reverse so they are chronologically ordered (newest at the bottom)
    logs_rec.reverse()
    return logs_rec

@router.delete("/logs")
async def clear_pipeline_logs(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(delete(models.PipelineLogRecord))
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success"}

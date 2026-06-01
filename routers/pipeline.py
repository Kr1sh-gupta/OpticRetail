# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
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
    q = select(models.PipelineLogRecord).order_by(models.PipelineLogRecord.id.desc()).limit(200)
    res = await db.execute(q)
    logs_rec = list(res.scalars().all())
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

import subprocess
import os

PIPELINE_PROC = None
POS_TASK = None

@router.post("/start")
async def start_pipeline(db: AsyncSession = Depends(get_db)):
    global PIPELINE_PROC, POS_TASK
    if PIPELINE_PROC is not None and PIPELINE_PROC.poll() is None:
        return {"status": "success", "message": "Pipeline already running"}

    try:
        await db.execute(delete(models.PipelineLogRecord))
        await db.execute(delete(models.EventRecord))
        await db.execute(delete(models.PipelineStatusRecord))
        await db.execute(delete(models.PosTransactionRecord))
        await db.commit()
    except Exception as e:
        await db.rollback()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    pipeline_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "pipeline"))
    venv_python = os.path.join(pipeline_dir, "venv", "Scripts", "python.exe")
    detect_script = os.path.join(pipeline_dir, "detect.py")

    try:
        import asyncio
        from load_csv import load_pos
        POS_TASK = asyncio.create_task(load_pos())
        
        PIPELINE_PROC = subprocess.Popen(
            [venv_python, detect_script],
            cwd=pipeline_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline: {str(e)}")

    return {"status": "success", "message": "Pipeline started successfully", "pid": PIPELINE_PROC.pid}

@router.post("/stop")
async def stop_pipeline(db: AsyncSession = Depends(get_db)):
    global PIPELINE_PROC, POS_TASK
    
    if POS_TASK is not None and not POS_TASK.done():
        POS_TASK.cancel()
        POS_TASK = None

    if PIPELINE_PROC is not None and PIPELINE_PROC.poll() is None:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(PIPELINE_PROC.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            PIPELINE_PROC = None
        except Exception as e:
            pass

    try:
        if os.name == 'nt':
            subprocess.run(["powershell", "-Command", "Get-WmiObject Win32_Process -Filter \\\"CommandLine LIKE '%detect.py%'\\\" | Invoke-WmiMethod -Name Terminate"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    try:
        stmt = insert(models.PipelineStatusRecord).values(
            store_id="STORE_BLR_002",
            status="OFFLINE",
            updated_at=datetime.now(timezone.utc)
        ).on_conflict_do_update(
            index_elements=['store_id'],
            set_={"status": "OFFLINE", "updated_at": datetime.now(timezone.utc)}
        )
        await db.execute(stmt)
        await db.commit()
    except Exception:
        await db.rollback()

    return {"status": "success", "message": "Pipeline stopped successfully"}


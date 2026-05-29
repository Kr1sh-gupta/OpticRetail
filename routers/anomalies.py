from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db

router = APIRouter(prefix="/stores", tags=["anomalies"])

@router.get("/{store_id}/anomalies")
async def get_anomalies(store_id: str, db: AsyncSession = Depends(get_db)):
    # Returning mock anomalies to feed the frontend's AnomalyTab until rules engine is fully tuned
    return [
        {
            "id": "ANOM_001",
            "type": "CRITICAL",
            "title": "Severe Queue Bottleneck",
            "time": "Just now",
            "zone": "CHECKOUT",
            "description": "Queue depth exceeded 15 people. Max wait time at 6m 12s.",
            "suggested_action": "Open Register 3. Reallocate 1 staff from Fragrance."
        },
        {
            "id": "ANOM_002",
            "type": "WARNING",
            "title": "Suspicious Loitering",
            "time": "14 minutes ago",
            "zone": "FRAGRANCE",
            "description": "Visitor lingering near high-value displays for >10 minutes.",
            "suggested_action": "Dispatch associate to zone for customer assistance."
        }
    ]

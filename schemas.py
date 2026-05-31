from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    ENTRY = "ENTRY"
    EXIT = "EXIT"
    ZONE_ENTER = "ZONE_ENTER"
    ZONE_EXIT = "ZONE_EXIT"
    ZONE_DWELL = "ZONE_DWELL"
    BILLING_QUEUE_JOIN = "BILLING_QUEUE_JOIN"
    BILLING_QUEUE_ABANDON = "BILLING_QUEUE_ABANDON"
    REENTRY = "REENTRY"
    SUSPICIOUS_BEHAVIOR = "SUSPICIOUS_BEHAVIOR"
    STAFF_INTERACTION = "STAFF_INTERACTION"
    DISPLAY_ENGAGEMENT = "DISPLAY_ENGAGEMENT"

class EventMetadata(BaseModel):
    queue_depth: Optional[int] = None
    sku_zone: Optional[str] = None
    session_seq: Optional[int] = None
    is_returning: Optional[bool] = None

class StoreEvent(BaseModel):
    event_id: str
    store_id: str
    camera_id: str
    visitor_id: str
    event_type: EventType
    timestamp: datetime
    zone_id: Optional[str] = None
    dwell_ms: int = 0
    is_staff: bool = False
    confidence: float
    metadata: EventMetadata = Field(default_factory=EventMetadata)

class PipelineStatusUpdate(BaseModel):
    store_id: str
    camera_id: str
    current_frame: int
    total_frames: int
    percentage: float
    fps: float
    status: str

class PipelineStatusResponse(BaseModel):
    store_id: str
    camera_id: str
    current_frame: int
    total_frames: int
    percentage: float
    fps: float
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True

class PipelineLogCreate(BaseModel):
    timestamp: datetime
    level: str
    message: str

class PipelineLogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: str

    class Config:
        from_attributes = True

class PosTransactionCreate(BaseModel):
    transaction_id: str
    timestamp: datetime
    basket_value_inr: float


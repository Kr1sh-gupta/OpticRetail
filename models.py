# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON
from database import Base

class EventRecord(Base):
    __tablename__ = "events"

    event_id = Column(String, primary_key=True, index=True)
    store_id = Column(String, index=True, nullable=False)
    camera_id = Column(String, nullable=False)
    visitor_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    zone_id = Column(String, nullable=True)
    dwell_ms = Column(Integer, default=0)
    is_staff = Column(Boolean, default=False)
    confidence = Column(Float, nullable=False)
    metadata_json = Column(JSON, nullable=True)

class PosTransactionRecord(Base):
    __tablename__ = "pos_transactions"
    store_id = Column(String, index=True)
    transaction_id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    basket_value_inr = Column(Float)

class PipelineStatusRecord(Base):
    __tablename__ = "pipeline_status"

    store_id = Column(String, primary_key=True)
    camera_id = Column(String, nullable=False)
    current_frame = Column(Integer, default=0)
    total_frames = Column(Integer, default=0)
    percentage = Column(Float, default=0.0)
    fps = Column(Float, default=0.0)
    status = Column(String, default="IDLE")
    updated_at = Column(DateTime(timezone=True), nullable=False)

class PipelineLogRecord(Base):
    __tablename__ = "pipeline_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    level = Column(String, nullable=False)
    message = Column(String, nullable=False)

"""
emit.py — Event Schema Builder & HTTP Emitter
=============================================
Constructs fully schema-compliant StoreEvent payloads and batches
them to the OpticRetail Intelligence API ingest endpoint.
"""
import uuid
import json
import logging
import requests
from typing import List, Dict, Any
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

API_URL = os.getenv("API_INGEST_URL", "http://localhost:8000/events/ingest")
BATCH_SIZE = int(os.getenv("EMIT_BATCH_SIZE", 50))

logger = logging.getLogger("opticretail.emit")


def build_event(
    store_id: str,
    camera_id: str,
    visitor_id: str,
    event_type: str,
    timestamp: datetime,
    zone_id: str = None,
    dwell_ms: int = 0,
    is_staff: bool = False,
    confidence: float = 0.90,
    queue_depth: int = None,
    session_seq: int = 0,
) -> Dict[str, Any]:
    """
    Constructs a single event payload that matches the required API schema.
    All fields comply with the problem statement specification.
    """
    return {
        "event_id": str(uuid.uuid4()),          # Globally unique — guarantees idempotency on re-ingest
        "store_id": store_id,
        "camera_id": camera_id,
        "visitor_id": visitor_id,
        "event_type": event_type,
        "timestamp": timestamp.isoformat(),
        "zone_id": zone_id,
        "dwell_ms": dwell_ms,
        "is_staff": bool(is_staff),
        "confidence": round(float(confidence), 4),
        "metadata": {
            "queue_depth": queue_depth,
            "sku_zone": zone_id,
            "session_seq": session_seq,
        }
    }


def emit_batch(events: List[Dict[str, Any]]) -> bool:
    """
    POSTs a batch of events to the ingest endpoint.
    Returns True on success, False on failure.
    Retries once on transient failures.
    """
    if not events:
        return True

    for attempt in range(2):
        try:
            response = requests.post(
                API_URL,
                json=events,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                logger.info(f"[EMIT] Sent {len(events)} events → {response.json()}")
                return True
            else:
                logger.warning(f"[EMIT] API returned {response.status_code}: {response.text}")
        except requests.exceptions.ConnectionError:
            logger.error(f"[EMIT] Connection failed (attempt {attempt + 1}/2). Is the API running?")
        except requests.exceptions.Timeout:
            logger.error(f"[EMIT] Request timed out (attempt {attempt + 1}/2).")

    return False


class EventBuffer:
    """
    Accumulates events in memory and flushes them in batches
    to avoid hammering the API with one request per frame.
    """
    def __init__(self, batch_size: int = BATCH_SIZE):
        self.buffer: List[Dict[str, Any]] = []
        self.batch_size = batch_size
        self.total_sent = 0

    def add(self, event: Dict[str, Any]):
        self.buffer.append(event)
        if len(self.buffer) >= self.batch_size:
            self.flush()

    def flush(self):
        if not self.buffer:
            return
        success = emit_batch(self.buffer)
        if success:
            self.total_sent += len(self.buffer)
        self.buffer.clear()

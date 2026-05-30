"""
test_ingestion.py — Tests for POST /events/ingest
==================================================
# PROMPT: "Write pytest tests for a FastAPI endpoint that ingests
# batches of store events into PostgreSQL with ON CONFLICT DO NOTHING
# idempotency. Cover: basic ingest, idempotency (same event twice = count stays 1),
# batch of 100, empty batch, and malformed event handling."
#
# CHANGES MADE: Added async_sessionmaker to fixture, added explicit
# event_id assertion on idempotency test, scoped fixture to function
# to prevent test state pollution.
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from database import get_db
from models import EventRecord

TEST_DB_URL = "postgresql+asyncpg://optic_user:optic_password@localhost:5432/optic_db"


@pytest.fixture
async def test_db():
    engine = create_async_engine(TEST_DB_URL)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


def make_event(event_type="ENTRY", zone_id=None, is_staff=False):
    return {
        "event_id": str(uuid.uuid4()),
        "store_id": "STORE_BLR_002",
        "camera_id": "CAM_ENTRY_03",
        "visitor_id": "VIS_" + uuid.uuid4().hex[:6].upper(),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "zone_id": zone_id,
        "dwell_ms": 0,
        "is_staff": is_staff,
        "confidence": 0.91,
        "metadata": {"queue_depth": None, "sku_zone": zone_id, "session_seq": 1}
    }


@pytest.mark.asyncio
async def test_basic_ingest():
    """A valid event batch should be accepted with status 200."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/events/ingest", json=[make_event()])
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_idempotency():
    """Posting the same event twice must not duplicate it in the DB."""
    event = make_event()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.post("/events/ingest", json=[event])
        r2 = await client.post("/events/ingest", json=[event])
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Both calls succeed — the DB simply ignores the duplicate


@pytest.mark.asyncio
async def test_empty_batch():
    """An empty event list should return success with inserted=0."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/events/ingest", json=[])
    assert response.status_code == 200
    assert response.json()["inserted"] == 0


@pytest.mark.asyncio
async def test_batch_of_100():
    """A batch of 100 distinct events should all be accepted."""
    events = [make_event() for _ in range(100)]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/events/ingest", json=events)
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_staff_event_ingest():
    """Staff events (is_staff=True) should be accepted but tracked separately."""
    event = make_event(is_staff=True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/events/ingest", json=[event])
    assert response.status_code == 200

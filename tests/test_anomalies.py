# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
"""
test_anomalies.py — Tests for GET /stores/{id}/anomalies
=========================================================
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app


def make_event(store_id, event_type, visitor_id=None, zone_id=None, dwell_ms=0, queue_depth=None, is_staff=False):
    return {
        "event_id": str(uuid.uuid4()),
        "store_id": store_id,
        "camera_id": "CAM_BILLING_05",
        "visitor_id": visitor_id or ("VIS_" + uuid.uuid4().hex[:6].upper()),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "zone_id": zone_id,
        "dwell_ms": dwell_ms,
        "is_staff": is_staff,
        "confidence": 0.87,
        "metadata": {"queue_depth": queue_depth, "sku_zone": zone_id, "session_seq": 1}
    }


@pytest.mark.asyncio
async def test_anomalies_empty_store_returns_clear():
    """A store with no events should return a clear/INFO status."""
    store_id = f"STORE_CLEAR_{uuid.uuid4().hex[:4]}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(f"/stores/{store_id}/anomalies")

    assert r.status_code == 200
    anomalies = r.json()
    assert isinstance(anomalies, list)
    assert len(anomalies) == 1
    assert anomalies[0]["type"] == "INFO"
    assert anomalies[0]["id"] == "ANOM_CLEAR"


@pytest.mark.asyncio
async def test_queue_spike_critical():
    """A BILLING_QUEUE_JOIN with queue_depth > 12 must trigger a CRITICAL anomaly."""
    store_id = f"STORE_QSPIKE_{uuid.uuid4().hex[:4]}"
    event = make_event(store_id, "BILLING_QUEUE_JOIN", zone_id="BILLING", queue_depth=15)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=[event])
        r = await client.get(f"/stores/{store_id}/anomalies")

    assert r.status_code == 200
    anomalies = r.json()
    queue_anomaly = next((a for a in anomalies if a["id"] == "ANOM_QUEUE_SPIKE"), None)
    assert queue_anomaly is not None
    assert queue_anomaly["type"] == "CRITICAL"


@pytest.mark.asyncio
async def test_queue_spike_warn():
    """A BILLING_QUEUE_JOIN with 8 < queue_depth <= 12 must trigger a WARN anomaly."""
    store_id = f"STORE_QWARN_{uuid.uuid4().hex[:4]}"
    event = make_event(store_id, "BILLING_QUEUE_JOIN", zone_id="BILLING", queue_depth=10)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=[event])
        r = await client.get(f"/stores/{store_id}/anomalies")

    assert r.status_code == 200
    anomalies = r.json()
    queue_anomaly = next((a for a in anomalies if a["id"] == "ANOM_QUEUE_SPIKE"), None)
    assert queue_anomaly is not None
    assert queue_anomaly["type"] == "WARN"


@pytest.mark.asyncio
async def test_loitering_detection():
    """A ZONE_DWELL event with dwell_ms > 600000 must trigger a WARN loitering anomaly."""
    store_id = f"STORE_LOITER_{uuid.uuid4().hex[:4]}"
    visitor_id = "VIS_LOITER_TEST"
    event = make_event(store_id, "ZONE_DWELL", visitor_id=visitor_id, zone_id="FRAGRANCE", dwell_ms=700000)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=[event])
        r = await client.get(f"/stores/{store_id}/anomalies")

    assert r.status_code == 200
    anomalies = r.json()
    loiter = next((a for a in anomalies if "LOITER" in a["id"]), None)
    assert loiter is not None
    assert loiter["type"] == "WARN"


@pytest.mark.asyncio
async def test_anomaly_has_suggested_action():
    """Every anomaly response must include a non-empty suggested_action field."""
    store_id = f"STORE_ACTION_{uuid.uuid4().hex[:4]}"
    event = make_event(store_id, "BILLING_QUEUE_JOIN", queue_depth=20)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=[event])
        r = await client.get(f"/stores/{store_id}/anomalies")

    for anomaly in r.json():
        assert "suggested_action" in anomaly
        assert len(anomaly["suggested_action"]) > 0

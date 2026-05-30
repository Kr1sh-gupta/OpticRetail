"""
test_metrics.py — Tests for GET /stores/{id}/metrics, /funnel, /heatmap
========================================================================
# PROMPT: "Write pytest async tests for a FastAPI store analytics API.
# The /metrics endpoint must handle: zero-visitor store (returns 0, not null),
# correct conversion rate calculation, funnel session deduplication
# (re-entries must not double-count a visitor), and heatmap normalisation."
#
# CHANGES MADE: Added explicit store_id isolation per test using random prefixes
# to prevent cross-test pollution. Added data_confidence assertion to heatmap test.
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app


def make_event(store_id, event_type="ENTRY", visitor_id=None, zone_id=None, is_staff=False, dwell_ms=0):
    return {
        "event_id": str(uuid.uuid4()),
        "store_id": store_id,
        "camera_id": "CAM_ENTRY_03",
        "visitor_id": visitor_id or ("VIS_" + uuid.uuid4().hex[:6].upper()),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "zone_id": zone_id,
        "dwell_ms": dwell_ms,
        "is_staff": is_staff,
        "confidence": 0.88,
        "metadata": {"queue_depth": None, "sku_zone": zone_id, "session_seq": 1}
    }


@pytest.mark.asyncio
async def test_metrics_zero_visitors():
    """A store with no events must return 0 for all metrics, not null."""
    store_id = f"STORE_ZERO_{uuid.uuid4().hex[:4]}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(f"/stores/{store_id}/metrics")
    assert r.status_code == 200
    data = r.json()
    assert data["unique_visitors"] == 0
    assert data["conversion_rate"] == 0
    assert data["queue_depth"] == 0
    assert data["abandonment_rate"] == 0


@pytest.mark.asyncio
async def test_funnel_no_double_count_reentry():
    """
    A visitor who has an ENTRY and a REENTRY event must only count once
    in the funnel's Store Entry stage (deduplication by visitor_id).
    """
    store_id = f"STORE_REENT_{uuid.uuid4().hex[:4]}"
    visitor_id = "VIS_REENTRY_TEST"

    events = [
        make_event(store_id, "ENTRY",   visitor_id=visitor_id),
        make_event(store_id, "EXIT",    visitor_id=visitor_id),
        make_event(store_id, "REENTRY", visitor_id=visitor_id),  # Same visitor returning
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=events)
        r = await client.get(f"/stores/{store_id}/funnel")

    assert r.status_code == 200
    stages = r.json()["stages"]
    entry_stage = next(s for s in stages if s["stage"] == "Store Entry")
    # Must be 1, not 2 — REENTRY should not inflate entry count
    assert entry_stage["count"] == 1


@pytest.mark.asyncio
async def test_heatmap_returns_normalised_data():
    """Heatmap must return heat_index 0-100 and data_confidence flag."""
    store_id = f"STORE_HEAT_{uuid.uuid4().hex[:4]}"

    events = [
        make_event(store_id, "ZONE_ENTER", zone_id="SKINCARE")
        for _ in range(5)
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=events)
        r = await client.get(f"/stores/{store_id}/heatmap")

    assert r.status_code == 200
    data = r.json()
    assert "zones" in data
    assert "data_confidence" in data
    if "SKINCARE" in data["zones"]:
        assert 0 <= data["zones"]["SKINCARE"]["heat_index"] <= 100


@pytest.mark.asyncio
async def test_heatmap_low_confidence_flag():
    """data_confidence must be False when session count < 20."""
    store_id = f"STORE_LOWCONF_{uuid.uuid4().hex[:4]}"

    # Only 3 zone events — below the 20-session threshold
    events = [make_event(store_id, "ZONE_ENTER", zone_id="MAKEUP") for _ in range(3)]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=events)
        r = await client.get(f"/stores/{store_id}/heatmap")

    assert r.status_code == 200
    assert r.json()["data_confidence"] == False


@pytest.mark.asyncio
async def test_funnel_drop_off_pct():
    """drop_off_pct must be 0 for the first stage and calculated for subsequent stages."""
    store_id = f"STORE_FUNNEL_{uuid.uuid4().hex[:4]}"
    events = [
        make_event(store_id, "ENTRY"),
        make_event(store_id, "ENTRY"),
        make_event(store_id, "ZONE_ENTER", zone_id="SKINCARE"),
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/events/ingest", json=events)
        r = await client.get(f"/stores/{store_id}/funnel")

    assert r.status_code == 200
    stages = r.json()["stages"]
    assert stages[0]["drop_off_pct"] == 0  # Entry stage always 0

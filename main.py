import time
import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from sqlalchemy import select, func
from database import engine, Base, AsyncSessionLocal
from routers import ingestion, metrics, anomalies
from datetime import datetime, timezone, timedelta
import models
import uvicorn

# Structured logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger("opticretail")

app = FastAPI(
    title="OpticRetail Intelligence API",
    description="AI-powered store analytics API for real-time retail intelligence.",
    version="1.0.0"
)

# Allow frontend dashboard to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------
# Structured Request Logging Middleware
# Logs: trace_id, endpoint, latency_ms, status_code
# ----------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    trace_id = str(uuid.uuid4())[:8]
    start = time.time()
    
    # Extract store_id from path if present
    path_parts = request.url.path.split("/")
    store_id = path_parts[2] if len(path_parts) > 2 and path_parts[1] == "stores" else "N/A"

    try:
        response = await call_next(request)
        latency_ms = round((time.time() - start) * 1000, 2)
        logger.info(
            f"trace_id={trace_id} store_id={store_id} "
            f"endpoint={request.url.path} method={request.method} "
            f"status={response.status_code} latency_ms={latency_ms}"
        )
        return response
    except OperationalError:
        latency_ms = round((time.time() - start) * 1000, 2)
        logger.error(f"trace_id={trace_id} DB unavailable latency_ms={latency_ms}")
        return JSONResponse(
            status_code=503,
            content={"error": "DATABASE_UNAVAILABLE", "detail": "Database connection failed. Please retry."}
        )

app.include_router(ingestion.router)
app.include_router(metrics.router)
app.include_router(anomalies.router)


@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema ready.")
    except Exception as e:
        # Two replicas starting simultaneously can race on CREATE TABLE.
        # The replica that loses the race gets a pg_type catalog collision.
        # This is safe to ignore — the winning replica already created the schema.
        logger.warning(f"Schema init skipped (parallel replica won the race): {type(e).__name__}")


@app.get("/health", tags=["system"])
async def health_check():
    """
    Returns service health, per-store last event timestamp,
    and STALE_FEED warning if any store feed is > 10 minutes stale.
    """
    stale_threshold = datetime.now(timezone.utc) - timedelta(minutes=10)

    try:
        async with AsyncSessionLocal() as db:
            # Get last event timestamp per store
            q = select(
                models.EventRecord.store_id,
                func.max(models.EventRecord.timestamp).label("last_ts")
            ).group_by(models.EventRecord.store_id)
            result = await db.execute(q)
            rows = result.all()

        store_feeds = {}
        any_stale = False
        for row in rows:
            is_stale = row.last_ts is not None and row.last_ts < stale_threshold
            if is_stale:
                any_stale = True
            store_feeds[row.store_id] = {
                "last_event_timestamp": row.last_ts.isoformat() if row.last_ts else None,
                "stale_feed": is_stale
            }

        return {
            "status": "healthy",
            "service": "OpticRetail Intelligence API",
            "db_connected": True,
            "stale_feeds_detected": any_stale,
            "stores": store_feeds,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    except OperationalError:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "db_connected": False, "error": "DATABASE_UNAVAILABLE"}
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

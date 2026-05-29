from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import ingestion, metrics, anomalies
import uvicorn

app = FastAPI(title="OpticRetail Intelligence API")

# Allow frontend dashboard to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion.router)
app.include_router(metrics.router)
app.include_router(anomalies.router)

@app.on_event("startup")
async def startup():
    # Initialize the database tables using SQLAlchemy
    async with engine.begin() as conn:
        # In production, use Alembic. For this prototype, create_all is fine.
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "OpticRetail API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

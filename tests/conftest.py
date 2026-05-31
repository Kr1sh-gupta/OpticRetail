import pytest
import asyncio
from database import get_db, AsyncSessionLocal
from main import app

# Global lock to serialize database transactions across all test client calls
DB_LOCK = asyncio.Lock()

async def override_get_db():
    async with DB_LOCK:
        async with AsyncSessionLocal() as session:
            yield session

# Override the app dependency globally for all pytest suites
app.dependency_overrides[get_db] = override_get_db

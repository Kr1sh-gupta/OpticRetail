# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
import pytest
import asyncio
from database import get_db, AsyncSessionLocal
from main import app

DB_LOCK = asyncio.Lock()

async def override_get_db():
    async with DB_LOCK:
        async with AsyncSessionLocal() as session:
            yield session

app.dependency_overrides[get_db] = override_get_db

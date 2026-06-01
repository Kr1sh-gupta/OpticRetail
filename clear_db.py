# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import AsyncSessionLocal
from sqlalchemy import text

async def clear_db():
    async with AsyncSessionLocal() as db:
        await db.execute(text('TRUNCATE TABLE events RESTART IDENTITY CASCADE;'))
        await db.execute(text('TRUNCATE TABLE pos_transactions RESTART IDENTITY CASCADE;'))
        await db.commit()
    print("Database tables 'events' and 'pos_transactions' cleared successfully!")

if __name__ == "__main__":
    asyncio.run(clear_db())

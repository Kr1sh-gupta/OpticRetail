# ============================================================================
# Copyright (c) 2026 Krish Gupta
# Licensed under the MIT License.
# ============================================================================
import pandas as pd
import asyncio
from datetime import datetime, timezone
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import engine, AsyncSessionLocal
import models
from sqlalchemy.dialects.postgresql import insert

async def load_pos():
    csv_path = "/CCTV_Footage/Brigade_Bangalore_10_April_26 (1)bc6219c.csv"
    if not os.path.exists(csv_path):
        csv_path = r"e:\purplle\CCTV Footage\Brigade_Bangalore_10_April_26 (1)bc6219c.csv"
    if not os.path.exists(csv_path):
        print(f"CSV not found at {csv_path}")
        return
        
    df = pd.read_csv(csv_path)
    
    transactions = {}
    for _, row in df.iterrows():
        invoice = row['invoice_number']
        date_str = row['order_date']
        time_str = row['order_time']
        store_id = "STORE_BLR_002"  # Override to match the demo store ID
        amount = float(row['total_amount']) if not pd.isna(row['total_amount']) else 0.0
        
        if invoice not in transactions:
            try:
                d = datetime.strptime(str(date_str).strip(), "%d-%m-%Y").date()
                t = datetime.strptime(str(time_str).strip(), "%H:%M:%S").time()
                from datetime import timedelta
                ist = timezone(timedelta(hours=5, minutes=30))
                dt = datetime(d.year, d.month, d.day, t.hour, t.minute, t.second, tzinfo=ist)
            except Exception as e:
                print(f"Error parsing time {time_str}: {e}")
                continue
                
            transactions[invoice] = {
                "transaction_id": invoice,
                "store_id": store_id,
                "timestamp": dt,
                "basket_value_inr": amount
            }
        else:
            transactions[invoice]["basket_value_inr"] += amount

    values = list(transactions.values())
    if not values:
        print("No transactions to insert.")
        return
        
    print(f"Parsed {len(values)} POS transactions. Sorting and splitting...")
    
    values.sort(key=lambda x: x["timestamp"])
    
    from datetime import timedelta
    ist = timezone(timedelta(hours=5, minutes=30))
    base_time = datetime(2026, 4, 10, 20, 10, 30, tzinfo=ist)
    
    past_txs = [tx for tx in values if tx["timestamp"] <= base_time]
    future_txs = [tx for tx in values if tx["timestamp"] > base_time]
    
    async with AsyncSessionLocal() as db:
        if past_txs:
            print(f"Inserting {len(past_txs)} past historical transactions instantly...")
            stmt = insert(models.PosTransactionRecord).values(past_txs)
            stmt = stmt.on_conflict_do_update(
                index_elements=['transaction_id'],
                set_={'basket_value_inr': stmt.excluded.basket_value_inr, 'timestamp': stmt.excluded.timestamp}
            )
            await db.execute(stmt)
            await db.commit()
            
        if future_txs:
            from sqlalchemy import select, func
            print(f"Streaming {len(future_txs)} future transactions synchronized with pipeline...")
            
            while future_txs:
                await asyncio.sleep(1.0)
                
                q = select(func.max(models.EventRecord.timestamp))
                res = await db.execute(q)
                current_sim_time = res.scalar()
                
                if not current_sim_time:
                    current_sim_time = base_time
                    
                ready_txs = []
                while future_txs and future_txs[0]["timestamp"] <= current_sim_time:
                    ready_txs.append(future_txs.pop(0))
                    
                if ready_txs:
                    stmt = insert(models.PosTransactionRecord).values(ready_txs)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['transaction_id'],
                        set_={'basket_value_inr': stmt.excluded.basket_value_inr, 'timestamp': stmt.excluded.timestamp}
                    )
                    await db.execute(stmt)
                    
                    log_values = []
                    for tx in ready_txs:
                        log_values.append({
                            "timestamp": tx["timestamp"],
                            "level": "INFO",
                            "message": f"[POS] Ingested POS Transaction {tx['transaction_id']} worth {tx['basket_value_inr']} INR."
                        })
                    await db.execute(insert(models.PipelineLogRecord).values(log_values))
                    await db.commit()
                    
                    for tx in ready_txs:
                        print(f"Streamed POS Transaction: {tx['transaction_id']} at {tx['timestamp']}")
                        
    print("Done loading POS transactions.")

if __name__ == "__main__":
    asyncio.run(load_pos())

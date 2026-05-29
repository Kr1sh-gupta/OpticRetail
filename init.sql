-- Create the pos_transactions table
CREATE TABLE IF NOT EXISTS pos_transactions (
    store_id VARCHAR(50),
    transaction_id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE,
    basket_value_inr NUMERIC(10, 2)
);

-- Seed mock POS transactions for STORE_BLR_002
INSERT INTO pos_transactions (store_id, transaction_id, timestamp, basket_value_inr) VALUES
('STORE_BLR_002', 'TXN_00441', '2026-03-03T14:38:12Z', 1240.00),
('STORE_BLR_002', 'TXN_00442', '2026-03-03T14:41:55Z', 680.00),
('STORE_BLR_002', 'TXN_00443', '2026-03-03T14:45:10Z', 2100.50),
('STORE_BLR_002', 'TXN_00444', '2026-03-03T14:50:30Z', 450.00),
('STORE_BLR_002', 'TXN_00445', '2026-03-03T15:02:15Z', 3200.00)
ON CONFLICT (transaction_id) DO NOTHING;

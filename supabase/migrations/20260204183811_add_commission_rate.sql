-- Add commission_rate to brokers table
-- This is the percentage commission the brokerage earns from loan amounts

ALTER TABLE brokers ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 2.00;

COMMENT ON COLUMN brokers.commission_rate IS 'Commission percentage earned on loan amounts (e.g., 2.00 = 2%)';

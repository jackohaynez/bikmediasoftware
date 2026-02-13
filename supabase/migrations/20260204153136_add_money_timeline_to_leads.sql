-- Add money_timeline field to leads table
-- Stores when the lead needs the money (e.g., "ASAP", "Within 2 weeks", "1-3 months")

ALTER TABLE leads ADD COLUMN money_timeline TEXT;

COMMENT ON COLUMN leads.money_timeline IS 'When the lead needs the money (urgency/timeline)';

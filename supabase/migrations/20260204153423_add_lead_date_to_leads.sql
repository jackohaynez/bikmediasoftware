-- Add lead_date field to leads table
-- Stores the date/time when the lead was submitted (from external sources)
-- Stored as TEXT to preserve original format (e.g., 2025-08-17T07:20:15.632Z)

ALTER TABLE leads ADD COLUMN lead_date TEXT;

COMMENT ON COLUMN leads.lead_date IS 'Date/time when the lead was submitted (ISO 8601 format)';

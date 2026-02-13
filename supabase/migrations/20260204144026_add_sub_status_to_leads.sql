-- Add sub_status field to leads table for sub-stages within Pending and Bad Lead statuses
ALTER TABLE leads ADD COLUMN sub_status TEXT;

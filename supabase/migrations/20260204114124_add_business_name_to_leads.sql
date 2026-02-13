-- Add business_name field to leads table
ALTER TABLE leads ADD COLUMN business_name TEXT;

COMMENT ON COLUMN leads.business_name IS 'Business or company name associated with the lead';

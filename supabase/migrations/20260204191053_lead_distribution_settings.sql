-- Lead distribution settings for auto-assigning leads to team members
-- When enabled, imported leads are automatically assigned based on percentage allocation

-- Add enabled flag to brokers table
ALTER TABLE brokers ADD COLUMN lead_distribution_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Table to store percentage allocations per user
CREATE TABLE lead_distribution_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broker_id, user_id)
);

-- Index for efficient querying
CREATE INDEX idx_lead_distribution_broker ON lead_distribution_allocations(broker_id);

-- RLS policies
ALTER TABLE lead_distribution_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allocations for their broker"
  ON lead_distribution_allocations
  FOR SELECT
  USING (broker_id = get_user_broker_id());

CREATE POLICY "Users can insert allocations for their broker"
  ON lead_distribution_allocations
  FOR INSERT
  WITH CHECK (broker_id = get_user_broker_id());

CREATE POLICY "Users can update allocations for their broker"
  ON lead_distribution_allocations
  FOR UPDATE
  USING (broker_id = get_user_broker_id());

CREATE POLICY "Users can delete allocations for their broker"
  ON lead_distribution_allocations
  FOR DELETE
  USING (broker_id = get_user_broker_id());

-- Counter to track assignment rotation (for weighted round-robin)
CREATE TABLE lead_distribution_counter (
  broker_id UUID PRIMARY KEY REFERENCES brokers(id) ON DELETE CASCADE,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lead_distribution_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view counter for their broker"
  ON lead_distribution_counter
  FOR SELECT
  USING (broker_id = get_user_broker_id());

CREATE POLICY "Users can upsert counter for their broker"
  ON lead_distribution_counter
  FOR ALL
  USING (broker_id = get_user_broker_id());

-- Lead cooldowns table to track when leads should be hidden from speed dialer
-- When a lead is called: hidden from ALL users for 24 hours
-- When a lead is skipped: hidden from THAT user only for 24 hours

CREATE TABLE lead_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('called', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for efficient querying
CREATE INDEX idx_lead_cooldowns_lead_id ON lead_cooldowns(lead_id);
CREATE INDEX idx_lead_cooldowns_expires_at ON lead_cooldowns(expires_at);
CREATE INDEX idx_lead_cooldowns_broker_id ON lead_cooldowns(broker_id);
CREATE INDEX idx_lead_cooldowns_user_action ON lead_cooldowns(user_id, action);

-- RLS policies
ALTER TABLE lead_cooldowns ENABLE ROW LEVEL SECURITY;

-- Users can view cooldowns for their broker
CREATE POLICY "Users can view cooldowns for their broker"
  ON lead_cooldowns
  FOR SELECT
  USING (broker_id = get_user_broker_id());

-- Users can insert cooldowns for their broker
CREATE POLICY "Users can insert cooldowns for their broker"
  ON lead_cooldowns
  FOR INSERT
  WITH CHECK (broker_id = get_user_broker_id());

-- Users can delete their own cooldowns (for cleanup)
CREATE POLICY "Users can delete their own cooldowns"
  ON lead_cooldowns
  FOR DELETE
  USING (broker_id = get_user_broker_id());

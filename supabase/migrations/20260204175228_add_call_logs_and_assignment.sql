-- Add assigned_to field to leads for manual assignment
-- Add call_logs table for detailed call tracking

-- =============================================
-- ADD ASSIGNED_TO TO LEADS
-- =============================================

ALTER TABLE leads ADD COLUMN assigned_to UUID;

-- Index for performance when querying by assigned user
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);

-- =============================================
-- CREATE CALL_LOGS TABLE
-- =============================================

CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,  -- Auth user who made the call
    user_name TEXT,         -- Denormalized for easy display
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CALL_LOGS RLS POLICIES
-- =============================================

-- Users can view call logs for their broker
CREATE POLICY "Users can view call logs for their broker"
ON call_logs FOR SELECT
USING (broker_id = get_user_broker_id());

-- Users can insert call logs for their broker
CREATE POLICY "Users can insert call logs for their broker"
ON call_logs FOR INSERT
WITH CHECK (broker_id = get_user_broker_id());

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX idx_call_logs_broker_id ON call_logs(broker_id);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE call_logs IS 'Detailed call logs for tracking call duration and notes per lead';
COMMENT ON COLUMN leads.assigned_to IS 'User ID of the team member assigned to this lead';

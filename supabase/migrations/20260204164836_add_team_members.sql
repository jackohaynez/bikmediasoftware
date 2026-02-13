-- Add team members table and update RLS policies
-- Team members are users who belong to a broker account and share access to leads

-- =============================================
-- TEAM MEMBERS TABLE
-- =============================================

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID UNIQUE NOT NULL,  -- Supabase auth user ID
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_team_members_broker_id ON team_members(broker_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTION FOR RLS
-- =============================================

-- Returns the broker_id for the current user
-- For brokers: returns their own auth.uid()
-- For team members: returns the broker_id from their user metadata
CREATE OR REPLACE FUNCTION get_user_broker_id()
RETURNS UUID AS $$
BEGIN
  -- If user is a broker, their auth ID is their broker ID
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'broker' THEN
    RETURN auth.uid();
  END IF;

  -- If user is a team member, get broker_id from metadata
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'team_member' THEN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'broker_id')::UUID;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TEAM MEMBERS POLICIES
-- =============================================

-- Brokers can view their own team members
CREATE POLICY "Brokers can view own team members"
    ON team_members FOR SELECT
    USING (broker_id = auth.uid());

-- Brokers can add team members to their account
CREATE POLICY "Brokers can add team members"
    ON team_members FOR INSERT
    WITH CHECK (broker_id = auth.uid());

-- Brokers can delete their team members
CREATE POLICY "Brokers can delete own team members"
    ON team_members FOR DELETE
    USING (broker_id = auth.uid());

-- =============================================
-- UPDATE LEADS POLICIES TO SUPPORT TEAM MEMBERS
-- =============================================

-- Drop existing broker policies for leads
DROP POLICY IF EXISTS "Brokers can view own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can insert own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can update own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can delete own leads" ON leads;

-- Create new policies using get_user_broker_id() helper
-- This allows both brokers and their team members to access leads

CREATE POLICY "Users can view own broker leads"
    ON leads FOR SELECT
    USING (broker_id = get_user_broker_id());

CREATE POLICY "Users can insert own broker leads"
    ON leads FOR INSERT
    WITH CHECK (broker_id = get_user_broker_id());

CREATE POLICY "Users can update own broker leads"
    ON leads FOR UPDATE
    USING (broker_id = get_user_broker_id());

CREATE POLICY "Users can delete own broker leads"
    ON leads FOR DELETE
    USING (broker_id = get_user_broker_id());

-- =============================================
-- UPDATE CSV_IMPORTS POLICIES
-- =============================================

-- Drop existing broker policy
DROP POLICY IF EXISTS "Brokers can view own imports" ON csv_imports;

-- Create new policy using helper
CREATE POLICY "Users can view own broker imports"
    ON csv_imports FOR SELECT
    USING (broker_id = get_user_broker_id());

-- =============================================
-- UPDATE BROKERS POLICIES
-- =============================================

-- Team members should be able to view their broker's profile
DROP POLICY IF EXISTS "Brokers can view own profile" ON brokers;

CREATE POLICY "Users can view own broker profile"
    ON brokers FOR SELECT
    USING (id = get_user_broker_id());

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE team_members IS 'Team members belonging to broker accounts';
COMMENT ON FUNCTION get_user_broker_id() IS 'Returns broker_id for current user (works for both brokers and team members)';

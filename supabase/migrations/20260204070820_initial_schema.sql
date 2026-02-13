-- BIK Media Mortgage Dashboard CRM - Initial Schema
-- This migration creates the core tables for the multi-tenant CRM

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Brokers table: Agency-managed broker workspaces
-- The broker's auth user ID will match their broker record ID
CREATE TABLE brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads table: Main leads with tenant isolation via broker_id
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
    external_id TEXT,                    -- original ID from CSV for deduplication
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loan_amount DECIMAL,
    loan_purpose TEXT,                   -- purchase, refinance, etc.
    property_type TEXT,
    status TEXT DEFAULT 'new',           -- new, contacted, qualified, submitted, approved, settled, lost
    tags TEXT[],
    notes TEXT,
    call_count INTEGER DEFAULT 0,
    source TEXT,                         -- csv_import, facebook, manual
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- CSV Imports table: Track import history for auditing
CREATE TABLE csv_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    total_rows INTEGER,
    imported_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER,
    errors JSONB,                        -- array of {row, message}
    imported_by UUID,                    -- admin user id
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

-- Fast broker filtering
CREATE INDEX idx_leads_broker_id ON leads(broker_id);

-- Pipeline queries
CREATE INDEX idx_leads_broker_status ON leads(broker_id, status);

-- Duplicate detection during import
CREATE INDEX idx_leads_broker_external_id ON leads(broker_id, external_id);

-- Email/phone lookup for deduplication
CREATE INDEX idx_leads_broker_email ON leads(broker_id, email);
CREATE INDEX idx_leads_broker_phone ON leads(broker_id, phone);

-- CSV imports by broker
CREATE INDEX idx_csv_imports_broker_id ON csv_imports(broker_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for leads table
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- Brokers policies
-- Brokers can only see their own record
CREATE POLICY "Brokers can view own profile"
    ON brokers FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Brokers can update own profile"
    ON brokers FOR UPDATE
    USING (id = auth.uid());

-- Leads policies
-- Brokers can only access their own leads (full CRUD)
CREATE POLICY "Brokers can view own leads"
    ON leads FOR SELECT
    USING (broker_id = auth.uid());

CREATE POLICY "Brokers can insert own leads"
    ON leads FOR INSERT
    WITH CHECK (broker_id = auth.uid());

CREATE POLICY "Brokers can update own leads"
    ON leads FOR UPDATE
    USING (broker_id = auth.uid());

CREATE POLICY "Brokers can delete own leads"
    ON leads FOR DELETE
    USING (broker_id = auth.uid());

-- CSV Imports policies
-- Brokers can view their own import history
CREATE POLICY "Brokers can view own imports"
    ON csv_imports FOR SELECT
    USING (broker_id = auth.uid());

-- Note: INSERT on csv_imports is done via admin client (service role) which bypasses RLS
-- This ensures only admins can create import records

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE brokers IS 'Broker accounts - each broker is a tenant with isolated data';
COMMENT ON TABLE leads IS 'Customer leads with tenant isolation via broker_id';
COMMENT ON TABLE csv_imports IS 'Audit log of CSV imports performed by admins';

COMMENT ON COLUMN leads.external_id IS 'Original ID from imported CSV for deduplication';
COMMENT ON COLUMN leads.status IS 'Pipeline status: new, contacted, qualified, submitted, approved, settled, lost';
COMMENT ON COLUMN leads.source IS 'Lead source: csv_import, facebook, manual';
COMMENT ON COLUMN csv_imports.errors IS 'JSON array of {row: number, message: string} for failed rows';

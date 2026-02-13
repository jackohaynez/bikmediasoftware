-- Add admin policies for managing brokers and importing leads
-- Admins are identified by role='admin' in user metadata

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
            false
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADMIN POLICIES FOR BROKERS TABLE
-- =============================================

-- Admins can view all brokers
CREATE POLICY "Admins can view all brokers"
    ON brokers FOR SELECT
    USING (is_admin());

-- Admins can create brokers
CREATE POLICY "Admins can create brokers"
    ON brokers FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update any broker
CREATE POLICY "Admins can update any broker"
    ON brokers FOR UPDATE
    USING (is_admin());

-- Admins can delete brokers
CREATE POLICY "Admins can delete brokers"
    ON brokers FOR DELETE
    USING (is_admin());

-- =============================================
-- ADMIN POLICIES FOR LEADS TABLE
-- =============================================

-- Admins can view all leads (for import verification, etc.)
CREATE POLICY "Admins can view all leads"
    ON leads FOR SELECT
    USING (is_admin());

-- Admins can insert leads for any broker (CSV import)
CREATE POLICY "Admins can insert leads"
    ON leads FOR INSERT
    WITH CHECK (is_admin());

-- =============================================
-- ADMIN POLICIES FOR CSV_IMPORTS TABLE
-- =============================================

-- Admins can view all import history
CREATE POLICY "Admins can view all imports"
    ON csv_imports FOR SELECT
    USING (is_admin());

-- Admins can create import records
CREATE POLICY "Admins can create import records"
    ON csv_imports FOR INSERT
    WITH CHECK (is_admin());

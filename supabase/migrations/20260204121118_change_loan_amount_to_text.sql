-- Change loan_amount from DECIMAL to TEXT to allow free-form input like "Less than 10k"
ALTER TABLE leads ALTER COLUMN loan_amount TYPE TEXT USING loan_amount::TEXT;

COMMENT ON COLUMN leads.loan_amount IS 'Loan amount - can be a number or description like "Less than 10k"';

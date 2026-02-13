/**
 * Parse a loan amount text field and extract the maximum value.
 * Handles formats like:
 * - "Less than $20,000" → 20000
 * - "$20,000 – $30,000" → 30000
 * - "$50,000 - $100,000" → 100000
 * - "50000" → 50000
 * - "$50k" → 50000
 * - "50K" → 50000
 */
export function parseLoanAmount(amount: string | null): number {
  if (!amount) return 0;

  // Find all numbers in the string (including those with commas, $, k suffix)
  const cleaned = amount.replace(/,/g, "");

  // Match numbers with optional k/K suffix
  const matches = cleaned.match(/\$?\d+(?:\.\d+)?[kK]?/g);

  if (!matches || matches.length === 0) return 0;

  // Parse each match and find the maximum
  const values = matches.map((match) => {
    let value = match.replace(/[$,]/g, "").toLowerCase();
    if (value.endsWith("k")) {
      return parseFloat(value.slice(0, -1)) * 1000;
    }
    return parseFloat(value);
  });

  // Return the maximum value found
  return Math.max(...values.filter((v) => !isNaN(v)), 0);
}

/**
 * Calculate commission from a loan amount
 * @param loanAmount - The loan amount (already parsed as number)
 * @param commissionRate - The commission rate as a percentage (e.g., 2.5 for 2.5%)
 * @returns The commission amount
 */
export function calculateCommission(loanAmount: number, commissionRate: number): number {
  return loanAmount * (commissionRate / 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format currency with more precision for smaller amounts
 */
export function formatCurrencyPrecise(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

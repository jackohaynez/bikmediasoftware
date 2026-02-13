// Status mapping from CSV values to database status + sub_status
export const STATUS_MAP: Record<string, { status: string; sub_status: string | null }> = {
  // Main statuses (case insensitive, trimmed)
  "new": { status: "new", sub_status: null },
  "no answer": { status: "no_answer", sub_status: null },
  "noanswer": { status: "no_answer", sub_status: null },
  "call back": { status: "call_back", sub_status: null },
  "callback": { status: "call_back", sub_status: null },
  "settled": { status: "settled", sub_status: null },

  // Pending sub-statuses (become pending + sub_status)
  "waiting on banking": { status: "pending", sub_status: "waiting_on_banking" },
  "waitingonbanking": { status: "pending", sub_status: "waiting_on_banking" },
  "indicative offer": { status: "pending", sub_status: "indicative_offer" },
  "indicativeoffer": { status: "pending", sub_status: "indicative_offer" },
  "docs out": { status: "pending", sub_status: "docs_out" },
  "docsout": { status: "pending", sub_status: "docs_out" },
  "submitted": { status: "pending", sub_status: "submitted" },
  "pending approval": { status: "pending", sub_status: "pending_approval" },
  "pendingapproval": { status: "pending", sub_status: "pending_approval" },
  "approved": { status: "pending", sub_status: "approved" },
  "pending": { status: "pending", sub_status: null },

  // Bad lead sub-statuses (become bad_lead + sub_status)
  "duplicate": { status: "bad_lead", sub_status: "duplicate" },
  "invalid number": { status: "bad_lead", sub_status: "invalid_number" },
  "invalidnumber": { status: "bad_lead", sub_status: "invalid_number" },
  "below minimum deposit": { status: "bad_lead", sub_status: "below_minimum_deposit" },
  "belowminimumdeposit": { status: "bad_lead", sub_status: "below_minimum_deposit" },
  "ineligible": { status: "bad_lead", sub_status: "ineligible" },
  "ineligable": { status: "bad_lead", sub_status: "ineligible" }, // Handle common typo
  "excessive dishonors": { status: "bad_lead", sub_status: "excessive_dishonors" },
  "excessivedishonors": { status: "bad_lead", sub_status: "excessive_dishonors" },
  "not interested": { status: "bad_lead", sub_status: "not_interested" },
  "notinterested": { status: "bad_lead", sub_status: "not_interested" },
  "bad lead": { status: "bad_lead", sub_status: null },
  "badlead": { status: "bad_lead", sub_status: null },
};

/**
 * Map a CSV status value to database status and sub_status
 */
export function mapStatus(csvStatus: string | undefined | null): { status: string; sub_status: string | null } {
  if (!csvStatus) {
    return { status: "new", sub_status: null };
  }

  // Normalize: lowercase, trim, remove extra spaces
  const normalized = csvStatus.toLowerCase().trim().replace(/\s+/g, " ");

  // Try direct match first
  if (STATUS_MAP[normalized]) {
    return STATUS_MAP[normalized];
  }

  // Try without spaces
  const noSpaces = normalized.replace(/\s/g, "");
  if (STATUS_MAP[noSpaces]) {
    return STATUS_MAP[noSpaces];
  }

  // Default to new if unrecognized
  return { status: "new", sub_status: null };
}

/**
 * Get all unique statuses from CSV data and show their mappings
 */
export function previewStatusMappings(statuses: string[]): Array<{
  csvValue: string;
  mappedStatus: string;
  mappedSubStatus: string | null;
  isRecognized: boolean;
}> {
  const uniqueStatuses = [...new Set(statuses.filter(Boolean))];

  return uniqueStatuses.map((csvValue) => {
    const mapped = mapStatus(csvValue);
    const normalized = csvValue.toLowerCase().trim().replace(/\s+/g, " ");
    const noSpaces = normalized.replace(/\s/g, "");
    const isRecognized = Boolean(STATUS_MAP[normalized] || STATUS_MAP[noSpaces]);

    return {
      csvValue,
      mappedStatus: mapped.status,
      mappedSubStatus: mapped.sub_status,
      isRecognized,
    };
  });
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Parse call count from string to number
 */
export function parseCallCount(value: string | undefined | null): number {
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Parse tags from string (comma-separated or single value)
 */
export function parseTags(value: string | undefined | null): string[] | null {
  if (!value) return null;

  // Check if comma-separated
  if (value.includes(",")) {
    return value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  // Single tag
  const trimmed = value.trim().toLowerCase();
  return trimmed ? [trimmed] : null;
}

/**
 * Parse date from various formats
 */
export function parseDate(value: string | undefined | null): string | null {
  if (!value) return null;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

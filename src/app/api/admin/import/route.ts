import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { LeadInsert, CsvImportInsert } from "@/types/supabase";
import { mapStatus, parseCallCount, parseTags, parseDate } from "@/lib/import-utils";

interface Allocation {
  user_id: string;
  user_name: string;
  percentage: number;
}

interface LeadData {
  full_name?: string;
  business_name?: string;
  monthly_turnover?: string;
  email?: string;
  phone?: string;
  loan_amount?: string;
  loan_purpose?: string;
  loan_term?: string;
  property_type?: string;
  external_id?: string;
  notes?: string;
  money_timeline?: string;
  // New fields for enhanced import
  status?: string;
  call_count?: string;
  created_at?: string;
  tags?: string;
  source?: string;
  broker_email?: string;
  broker_name?: string;
}

interface AssignableUser {
  user_id: string;
  email: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is an admin
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { broker_id, filename, leads } = body as {
      broker_id: string;
      filename: string;
      leads: LeadData[];
    };

    if (!broker_id || !leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { error: "broker_id and leads array are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify broker exists and get distribution settings
    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("id, email, lead_distribution_enabled")
      .eq("id", broker_id)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json({ error: "Broker not found" }, { status: 404 });
    }

    // Build user lookup maps for broker assignment
    const assignableUsers: AssignableUser[] = [];

    // Add broker owner to lookup (broker.id is also the auth user id)
    // First get broker's name
    const { data: brokerDetails } = await adminClient
      .from("brokers")
      .select("name")
      .eq("id", broker_id)
      .single();

    if (broker.email) {
      assignableUsers.push({
        user_id: broker.id,
        email: broker.email.toLowerCase().trim(),
        name: brokerDetails?.name || "Owner",
      });
    }

    // Add team members to lookup
    const { data: teamMembers } = await adminClient
      .from("team_members")
      .select("user_id, email, name")
      .eq("broker_id", broker_id);

    if (teamMembers) {
      for (const member of teamMembers) {
        assignableUsers.push({
          user_id: member.user_id,
          email: member.email?.toLowerCase().trim() || "",
          name: member.name || member.email || "",
        });
      }
    }

    // Build quick lookup maps
    const emailToUserId: Record<string, string> = {};
    const nameToUserId: Record<string, string> = {};

    for (const user of assignableUsers) {
      if (user.email) {
        emailToUserId[user.email] = user.user_id;
      }
      if (user.name) {
        nameToUserId[user.name.toLowerCase().trim()] = user.user_id;
      }
    }

    // Get distribution allocations if enabled (fallback when no broker_email)
    let distributionAllocations: Allocation[] = [];
    let distributionSlots: string[] = [];
    let distributionCounter = 0;

    if (broker.lead_distribution_enabled) {
      const { data: allocations } = await adminClient
        .from("lead_distribution_allocations")
        .select("user_id, user_name, percentage")
        .eq("broker_id", broker_id)
        .order("user_id");

      if (allocations && allocations.length > 0) {
        distributionAllocations = allocations as Allocation[];

        // Build assignment slots based on percentages
        for (const alloc of distributionAllocations) {
          for (let i = 0; i < alloc.percentage; i++) {
            distributionSlots.push(alloc.user_id);
          }
        }

        // Get current counter
        const { data: counterData } = await adminClient
          .from("lead_distribution_counter")
          .select("counter")
          .eq("broker_id", broker_id)
          .single();

        distributionCounter = counterData?.counter ?? 0;
      }
    }

    // Helper function to get next assigned user from distribution
    const getNextDistributedUser = (): string | null => {
      if (distributionSlots.length === 0) return null;
      const userId = distributionSlots[distributionCounter % distributionSlots.length];
      distributionCounter = (distributionCounter + 1) % 100;
      return userId;
    };

    // Helper function to find user by name (with fuzzy matching)
    const findUserByName = (name: string): string | null => {
      const normalized = name.toLowerCase().trim();

      // Exact match first
      if (nameToUserId[normalized]) {
        return nameToUserId[normalized];
      }

      // Fuzzy match - check if any user name contains or is contained in the search name
      for (const user of assignableUsers) {
        const userName = user.name.toLowerCase().trim();
        if (userName.includes(normalized) || normalized.includes(userName)) {
          return user.user_id;
        }
      }

      return null;
    };

    // Helper function to get assigned user - prioritize broker_email, then broker_name, fallback to distribution
    const getAssignedUser = (brokerEmail: string | undefined, brokerName: string | undefined): string | null => {
      // Try email first
      if (brokerEmail) {
        const normalized = brokerEmail.toLowerCase().trim();
        if (emailToUserId[normalized]) {
          return emailToUserId[normalized];
        }
      }

      // Try name second
      if (brokerName) {
        const foundUser = findUserByName(brokerName);
        if (foundUser) {
          return foundUser;
        }
      }

      // If email or name was provided but not matched, leave unassigned
      if (brokerEmail || brokerName) {
        return null;
      }

      // No email/name provided - use distribution
      return getNextDistributedUser();
    };

    // Get existing leads for duplicate detection
    const { data: existingLeads } = await adminClient
      .from("leads")
      .select("external_id, email, phone")
      .eq("broker_id", broker_id);

    type ExistingLead = { external_id: string | null; email: string | null; phone: string | null };
    const leads_array = (existingLeads || []) as ExistingLead[];

    const existingExternalIds = new Set(
      leads_array
        .filter((l) => l.external_id)
        .map((l) => l.external_id?.toLowerCase())
    );
    const existingEmails = new Set(
      leads_array
        .filter((l) => l.email)
        .map((l) => l.email?.toLowerCase())
    );
    const existingPhones = new Set(
      leads_array
        .filter((l) => l.phone)
        .map((l) => l.phone?.replace(/\D/g, ""))
    );

    let imported_count = 0;
    let skipped_count = 0;
    let error_count = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Log first lead for debugging
    if (leads.length > 0) {
      console.log("=== Import Debug ===");
      console.log("First lead data received:", JSON.stringify(leads[0], null, 2));
      console.log("Assignable users:", assignableUsers.map(u => ({ name: u.name, email: u.email })));
    }

    // Prepare all valid leads for batch insert
    const leadsToInsert: LeadInsert[] = [];
    const rowNumbers: number[] = []; // Track which row each lead came from

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowNum = i + 2; // +2 because CSV has header row and is 1-indexed

      // Validate required fields
      if (!lead.full_name || lead.full_name.trim() === "") {
        errors.push({ row: rowNum, message: "Missing full name" });
        error_count++;
        continue;
      }

      // Check for duplicates
      const externalId = lead.external_id?.toLowerCase();
      const email = lead.email?.toLowerCase();
      const phone = lead.phone?.replace(/\D/g, "");

      // Check by external_id first
      if (externalId && existingExternalIds.has(externalId)) {
        skipped_count++;
        continue;
      }

      // Check by email
      if (email && existingEmails.has(email)) {
        skipped_count++;
        continue;
      }

      // Check by phone
      if (phone && phone.length >= 10 && existingPhones.has(phone)) {
        skipped_count++;
        continue;
      }

      // Map status from CSV
      const { status, sub_status } = mapStatus(lead.status);

      // Get assigned user (from broker_email, broker_name, or distribution)
      const assignedTo = getAssignedUser(lead.broker_email, lead.broker_name);

      // Parse additional fields
      const callCount = parseCallCount(lead.call_count);
      const tags = parseTags(lead.tags);
      const createdAt = parseDate(lead.created_at);

      // Debug log for first few rows
      if (i < 3) {
        console.log(`Row ${rowNum}:`, {
          name: lead.full_name,
          status_csv: lead.status,
          status_mapped: status,
          sub_status_mapped: sub_status,
          broker_name_csv: lead.broker_name,
          assigned_to: assignedTo,
          call_count_csv: lead.call_count,
          call_count_parsed: callCount,
          phone: lead.phone,
          source: lead.source,
        });
      }

      // Prepare the lead data
      const leadInsertData: LeadInsert = {
        broker_id,
        full_name: lead.full_name.trim(),
        business_name: lead.business_name?.trim() || null,
        monthly_turnover: lead.monthly_turnover?.trim() || null,
        money_timeline: lead.money_timeline?.trim() || null,
        email: lead.email?.trim() || null,
        phone: lead.phone?.trim() || null,
        loan_amount: lead.loan_amount?.trim() || null,
        loan_purpose: lead.loan_purpose?.trim() || null,
        loan_term: lead.loan_term?.trim() || null,
        property_type: lead.property_type?.trim() || null,
        external_id: lead.external_id?.trim() || null,
        notes: lead.notes?.trim() || null,
        source: lead.source?.trim() || "csv_import",
        status,
        sub_status,
        call_count: callCount,
        tags,
        assigned_to: assignedTo,
        ...(createdAt && { created_at: createdAt }),
      };

      leadsToInsert.push(leadInsertData);
      rowNumbers.push(rowNum);

      // Add to existing sets for duplicate checks within the same import
      if (externalId) existingExternalIds.add(externalId);
      if (email) existingEmails.add(email);
      if (phone && phone.length >= 10) existingPhones.add(phone);
    }

    // Batch insert leads (100 at a time for optimal performance)
    const BATCH_SIZE = 100;
    console.log(`Inserting ${leadsToInsert.length} leads in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
      const batchRowNumbers = rowNumbers.slice(i, i + BATCH_SIZE);

      const { error: batchError } = await adminClient
        .from("leads")
        .insert(batch as never[]);

      if (batchError) {
        // If batch fails, try inserting one by one to identify problematic rows
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed, trying individual inserts...`);
        for (let j = 0; j < batch.length; j++) {
          const { error: singleError } = await adminClient
            .from("leads")
            .insert(batch[j] as never);

          if (singleError) {
            errors.push({ row: batchRowNumbers[j], message: singleError.message });
            error_count++;
          } else {
            imported_count++;
          }
        }
      } else {
        imported_count += batch.length;
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} inserted successfully (${batch.length} leads)`);
      }
    }

    // Update distribution counter if distribution was used
    if (broker.lead_distribution_enabled && distributionSlots.length > 0) {
      await adminClient
        .from("lead_distribution_counter")
        .upsert({
          broker_id,
          counter: distributionCounter,
          updated_at: new Date().toISOString(),
        });
    }

    // Record the import
    const importRecord: CsvImportInsert = {
      broker_id,
      filename,
      total_rows: leads.length,
      imported_count,
      skipped_count,
      error_count,
      errors: errors.length > 0 ? errors : null,
      imported_by: user.id,
    };
    await adminClient.from("csv_imports").insert(importRecord as never);

    return NextResponse.json({
      success: true,
      imported_count,
      skipped_count,
      error_count,
      errors,
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

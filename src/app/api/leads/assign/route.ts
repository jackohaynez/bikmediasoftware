import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

interface Allocation {
  user_id: string;
  user_name: string;
  percentage: number;
}

/**
 * Get the next user to assign a lead to based on weighted distribution.
 * Uses a counter-based weighted round-robin algorithm.
 */
export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get broker ID
  let brokerId = user.id;
  const { data: broker } = await supabase
    .from("brokers")
    .select("id, lead_distribution_enabled")
    .eq("id", user.id)
    .single();

  if (!broker) {
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("broker_id")
      .eq("user_id", user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json({ assigned_to: null });
    }
    brokerId = teamMember.broker_id;

    // Get broker settings
    const { data: brokerData } = await supabase
      .from("brokers")
      .select("lead_distribution_enabled")
      .eq("id", brokerId)
      .single();

    if (!brokerData?.lead_distribution_enabled) {
      return NextResponse.json({ assigned_to: null });
    }
  } else if (!broker.lead_distribution_enabled) {
    return NextResponse.json({ assigned_to: null });
  }

  // Get allocations
  const { data: allocations } = await supabase
    .from("lead_distribution_allocations")
    .select("user_id, user_name, percentage")
    .eq("broker_id", brokerId)
    .order("user_id");

  if (!allocations || allocations.length === 0) {
    return NextResponse.json({ assigned_to: null });
  }

  // Get or create counter
  let { data: counterData } = await supabase
    .from("lead_distribution_counter")
    .select("counter")
    .eq("broker_id", brokerId)
    .single();

  let counter = counterData?.counter ?? 0;

  // Calculate total "slots" (LCM approach - use 100 slots for percentages)
  // Each user gets `percentage` slots out of 100
  const totalSlots = 100;

  // Build the assignment array based on percentages
  const assignmentSlots: string[] = [];
  for (const alloc of allocations) {
    for (let i = 0; i < alloc.percentage; i++) {
      assignmentSlots.push(alloc.user_id);
    }
  }

  if (assignmentSlots.length === 0) {
    return NextResponse.json({ assigned_to: null });
  }

  // Get the user at the current counter position
  const assignedUserId = assignmentSlots[counter % assignmentSlots.length];
  const assignedUser = allocations.find((a) => a.user_id === assignedUserId);

  // Increment counter
  const newCounter = (counter + 1) % totalSlots;

  // Update or insert counter
  if (counterData) {
    await supabase
      .from("lead_distribution_counter")
      .update({ counter: newCounter, updated_at: new Date().toISOString() })
      .eq("broker_id", brokerId);
  } else {
    await supabase
      .from("lead_distribution_counter")
      .insert({ broker_id: brokerId, counter: newCounter });
  }

  return NextResponse.json({
    assigned_to: assignedUserId,
    assigned_name: assignedUser?.user_name || null,
  });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

interface AllocationInput {
  user_id: string;
  user_name: string;
  percentage: number;
}

export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get broker settings
  const { data: broker, error: brokerError } = await supabase
    .from("brokers")
    .select("id, lead_distribution_enabled")
    .eq("id", user.id)
    .single();

  if (brokerError) {
    // Try team_members if not a broker
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("broker_id")
      .eq("user_id", user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: brokerData } = await supabase
      .from("brokers")
      .select("id, lead_distribution_enabled")
      .eq("id", teamMember.broker_id)
      .single();

    if (!brokerData) {
      return NextResponse.json({ error: "Broker not found" }, { status: 404 });
    }

    // Get allocations
    const { data: allocations } = await supabase
      .from("lead_distribution_allocations")
      .select("*")
      .eq("broker_id", brokerData.id)
      .order("user_name");

    return NextResponse.json({
      enabled: brokerData.lead_distribution_enabled,
      allocations: allocations || [],
    });
  }

  // Get allocations for broker
  const { data: allocations } = await supabase
    .from("lead_distribution_allocations")
    .select("*")
    .eq("broker_id", broker.id)
    .order("user_name");

  return NextResponse.json({
    enabled: broker.lead_distribution_enabled,
    allocations: allocations || [],
  });
}

export async function PUT(req: Request) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { enabled, allocations } = body as {
    enabled: boolean;
    allocations: AllocationInput[];
  };

  // Validate allocations sum to 100% if enabled
  if (enabled && allocations.length > 0) {
    const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (total !== 100) {
      return NextResponse.json(
        { error: `Percentages must add up to 100%. Current total: ${total}%` },
        { status: 400 }
      );
    }
  }

  // Get broker ID
  let brokerId = user.id;
  const { data: broker } = await supabase
    .from("brokers")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!broker) {
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("broker_id")
      .eq("user_id", user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    brokerId = teamMember.broker_id;
  }

  // Update broker setting
  const { error: updateError } = await supabase
    .from("brokers")
    .update({ lead_distribution_enabled: enabled })
    .eq("id", brokerId);

  if (updateError) {
    console.error("Error updating broker:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete existing allocations
  await supabase
    .from("lead_distribution_allocations")
    .delete()
    .eq("broker_id", brokerId);

  // Insert new allocations if enabled
  if (enabled && allocations.length > 0) {
    const { error: insertError } = await supabase
      .from("lead_distribution_allocations")
      .insert(
        allocations.map((a) => ({
          broker_id: brokerId,
          user_id: a.user_id,
          user_name: a.user_name,
          percentage: a.percentage,
        }))
      );

    if (insertError) {
      console.error("Error inserting allocations:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

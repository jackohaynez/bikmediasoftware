import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lead_id, action } = body;

  if (!lead_id || !action) {
    return NextResponse.json(
      { error: "lead_id and action are required" },
      { status: 400 }
    );
  }

  if (!["called", "skipped"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'called' or 'skipped'" },
      { status: 400 }
    );
  }

  // Get the lead to find the broker_id
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("broker_id")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Insert the cooldown record
  const { data, error } = await supabase.from("lead_cooldowns").insert({
    lead_id,
    user_id: user.id,
    broker_id: lead.broker_id,
    action,
  });

  if (error) {
    console.error("Error inserting cooldown:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active cooldowns (not expired)
  const { data, error } = await supabase
    .from("lead_cooldowns")
    .select("lead_id, user_id, action, expires_at")
    .gte("expires_at", new Date().toISOString());

  if (error) {
    console.error("Error fetching cooldowns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cooldowns: data || [] });
}

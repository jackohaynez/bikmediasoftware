import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/analytics - Get aggregated analytics data
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    const brokerId = role === "broker" ? user.id : user.user_metadata?.broker_id;

    if (!brokerId) {
      return NextResponse.json({ error: "No broker ID found" }, { status: 400 });
    }

    // Fetch all leads for this broker
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("broker_id", brokerId);

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    // Fetch all call logs for this broker
    const { data: callLogs, error: callLogsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("broker_id", brokerId);

    if (callLogsError) {
      return NextResponse.json({ error: callLogsError.message }, { status: 500 });
    }

    // Fetch team members
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("*")
      .eq("broker_id", brokerId);

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }

    // Fetch broker info
    const { data: broker } = await supabase
      .from("brokers")
      .select("*")
      .eq("id", brokerId)
      .single();

    return NextResponse.json({
      leads: leads || [],
      callLogs: callLogs || [],
      teamMembers: teamMembers || [],
      broker,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

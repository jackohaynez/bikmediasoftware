import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    // Get the broker_id for the current user
    const role = user.user_metadata?.role;
    let brokerId = user.id;

    // If team member, get their broker_id
    if (role === "team_member") {
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("broker_id")
        .eq("user_id", user.id)
        .single();

      if (teamMember) {
        brokerId = teamMember.broker_id;
      }
    }

    // First, explicitly delete associated data to ensure clean removal
    // Note: The database has ON DELETE CASCADE, but we delete explicitly for clarity

    // Delete call logs for these leads
    const { error: callLogsError } = await supabase
      .from("call_logs")
      .delete()
      .in("lead_id", leadIds)
      .eq("broker_id", brokerId);

    if (callLogsError) {
      console.error("Error deleting call logs:", callLogsError);
      // Continue anyway - the cascade will handle it
    }

    // Delete lead cooldowns for these leads
    const { error: cooldownsError } = await supabase
      .from("lead_cooldowns")
      .delete()
      .in("lead_id", leadIds)
      .eq("broker_id", brokerId);

    if (cooldownsError) {
      console.error("Error deleting cooldowns:", cooldownsError);
      // Continue anyway - the cascade will handle it
    }

    // Now delete the leads themselves
    // This will also cascade delete any remaining associated records
    const { error, count } = await supabase
      .from("leads")
      .delete()
      .in("id", leadIds)
      .eq("broker_id", brokerId);

    if (error) {
      console.error("Delete leads error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Permanently deleted ${count} lead(s) and all associated data (call logs, cooldowns)`
    });
  } catch (error) {
    console.error("Delete leads error:", error);
    return NextResponse.json(
      { error: "Failed to delete leads" },
      { status: 500 }
    );
  }
}

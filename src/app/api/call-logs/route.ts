import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { CallLogInsert } from "@/types/supabase";

// POST /api/call-logs - Create a new call log
export async function POST(request: NextRequest) {
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
    const userName = user.user_metadata?.name || user.email;

    if (!brokerId) {
      return NextResponse.json({ error: "No broker ID found" }, { status: 400 });
    }

    const body = await request.json();
    const { lead_id, duration_seconds, notes } = body;

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    const callLogData: CallLogInsert = {
      lead_id,
      broker_id: brokerId,
      user_id: user.id,
      user_name: userName,
      duration_seconds: duration_seconds || 0,
      notes: notes || null,
    };

    const { data: callLog, error } = await supabase
      .from("call_logs")
      .insert(callLogData as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ callLog }, { status: 201 });
  } catch (error) {
    console.error("Error creating call log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/call-logs?lead_id=xxx - Get call logs for a lead
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");

    if (!leadId) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    const { data: callLogs, error } = await supabase
      .from("call_logs")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ callLogs });
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

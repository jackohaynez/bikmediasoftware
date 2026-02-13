import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/settings/broker - Get broker settings
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "broker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: broker, error } = await supabase
      .from("brokers")
      .select("id, name, email, company, commission_rate")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broker });
  } catch (error) {
    console.error("Error fetching broker settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/broker - Update broker settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "broker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { commission_rate } = body;

    // Validate commission rate
    if (commission_rate !== undefined) {
      const rate = parseFloat(commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "Commission rate must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    const { data: broker, error } = await supabase
      .from("brokers")
      .update({ commission_rate: commission_rate ?? null })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broker });
  } catch (error) {
    console.error("Error updating broker settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

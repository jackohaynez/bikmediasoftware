import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { Broker, TeamMember, CsvImport } from "@/types/supabase";

// GET /api/admin/brokers/[id] - Get sub account details with users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Get broker info
    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("*")
      .eq("id", id)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json(
        { error: "Sub account not found" },
        { status: 404 }
      );
    }

    // Get team members
    const { data: teamMembers, error: teamError } = await adminClient
      .from("team_members")
      .select("*")
      .eq("broker_id", id)
      .order("created_at", { ascending: false });

    if (teamError) {
      console.error("Error fetching team members:", teamError);
    }

    // Get import history
    const { data: imports, error: importsError } = await adminClient
      .from("csv_imports")
      .select("*")
      .eq("broker_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (importsError) {
      console.error("Error fetching imports:", importsError);
    }

    return NextResponse.json({
      broker: broker as Broker,
      teamMembers: (teamMembers || []) as TeamMember[],
      imports: (imports || []) as CsvImport[],
    });
  } catch (error) {
    console.error("Error fetching sub account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/brokers/[id] - Update sub account details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, company } = body;

    // Validate at least one field is provided
    if (!name && !company) {
      return NextResponse.json(
        { error: "Name or company is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Build update object with only provided fields
    const updateData: { name?: string; company?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;

    // Update broker record
    const { data: broker, error: updateError } = await adminClient
      .from("brokers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ broker });
  } catch (error) {
    console.error("Error updating sub account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/brokers/[id] - Delete sub account and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify broker exists
    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("id")
      .eq("id", id)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json(
        { error: "Sub account not found" },
        { status: 404 }
      );
    }

    // Get all team members to delete their auth users
    const { data: teamMembers } = await adminClient
      .from("team_members")
      .select("user_id")
      .eq("broker_id", id);

    // Delete team member auth users
    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers) {
        await adminClient.auth.admin.deleteUser(member.user_id).catch((err: Error) => {
          console.error("Error deleting team member auth user:", err);
        });
      }
    }

    // Delete the owner auth user (broker id = auth user id)
    await adminClient.auth.admin.deleteUser(id).catch((err: Error) => {
      console.error("Error deleting owner auth user:", err);
    });

    // Delete broker record (cascades to leads, team_members, csv_imports)
    const { error: deleteError } = await adminClient
      .from("brokers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sub account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

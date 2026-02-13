import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { TeamMember } from "@/types/supabase";

// DELETE /api/admin/brokers/[id]/users/[userId] - Remove user from sub account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: brokerId, userId } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get the team member to find their auth user_id
    const { data, error: fetchError } = await adminClient
      .from("team_members")
      .select("*")
      .eq("id", userId)
      .eq("broker_id", brokerId)
      .single();

    const teamMember = data as TeamMember | null;

    if (fetchError || !teamMember) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      teamMember.user_id
    );

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
    }

    // Delete team_members record
    const { error: deleteError } = await adminClient
      .from("team_members")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

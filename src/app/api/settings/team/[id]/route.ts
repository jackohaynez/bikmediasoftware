import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { TeamMember } from "@/types/supabase";

// DELETE /api/settings/team/[id] - Remove team member
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

    if (!user || user.user_metadata?.role !== "broker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the team member to find their auth user_id
    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("*")
      .eq("id", id)
      .single();

    const teamMember = data as TeamMember | null;

    if (fetchError || !teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Delete auth user using admin client
    const adminClient = createAdminClient();
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      teamMember.user_id
    );

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      // Continue to delete the record even if auth deletion fails
    }

    // Delete team_members record (should cascade from auth, but ensure it's gone)
    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

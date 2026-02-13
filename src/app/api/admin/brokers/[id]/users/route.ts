import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { TeamMemberInsert } from "@/types/supabase";

// GET /api/admin/brokers/[id]/users - Get all assignable users for a broker
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brokerId } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get broker info (owner)
    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("id, email, name")
      .eq("id", brokerId)
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
      .select("user_id, email, name")
      .eq("broker_id", brokerId);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
    }

    // Build list of assignable users
    const users = [
      {
        user_id: broker.id,
        email: broker.email,
        name: broker.name || "Owner",
        type: "owner" as const,
      },
      ...(teamMembers || []).map((member: { user_id: string; email: string; name: string | null }) => ({
        user_id: member.user_id,
        email: member.email,
        name: member.name || member.email,
        type: "team_member" as const,
      })),
    ];

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/brokers/[id]/users - Add user to sub account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brokerId } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify broker exists
    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("id")
      .eq("id", brokerId)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json(
        { error: "Sub account not found" },
        { status: 404 }
      );
    }

    // Create auth user with team_member role
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "team_member",
          broker_id: brokerId,
          name: name || null,
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create team_members record
    const teamMemberData: TeamMemberInsert = {
      broker_id: brokerId,
      user_id: authData.user.id,
      email,
      name: name || null,
    };

    const { data: teamMember, error: teamMemberError } = await adminClient
      .from("team_members")
      .insert(teamMemberData)
      .select()
      .single();

    if (teamMemberError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: teamMemberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ teamMember }, { status: 201 });
  } catch (error) {
    console.error("Error adding user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

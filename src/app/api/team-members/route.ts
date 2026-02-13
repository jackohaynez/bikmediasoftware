import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { TeamMemberOption, TeamMember, Broker } from "@/types/supabase";

// GET /api/team-members - List team members for assignment dropdown
// Works for both brokers and team members
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

    // Get team members
    const { data: teamMembersData, error } = await supabase
      .from("team_members")
      .select("id, user_id, name, email")
      .eq("broker_id", brokerId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const teamMembers = teamMembersData as Pick<TeamMember, "id" | "user_id" | "name" | "email">[] | null;

    // Get broker info to include them as an option
    const { data: brokerData } = await supabase
      .from("brokers")
      .select("id, name, email")
      .eq("id", brokerId)
      .single();

    const broker = brokerData as Pick<Broker, "id" | "name" | "email"> | null;

    // Build options list
    const options: TeamMemberOption[] = [];

    // Add broker first (with user_id = broker's id for brokers)
    if (broker) {
      options.push({
        id: broker.id,
        user_id: broker.id,
        name: broker.name + " (Owner)",
        email: broker.email,
      });
    }

    // Add team members
    if (teamMembers) {
      for (const member of teamMembers) {
        options.push({
          id: member.id,
          user_id: member.user_id,
          name: member.name || member.email,
          email: member.email,
        });
      }
    }

    return NextResponse.json({ teamMembers: options });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

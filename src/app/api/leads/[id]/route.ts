import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine the broker_id - either the user is the owner or a team member
  const brokerId = user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id
    ? user.user_metadata.broker_id
    : user.id;

  const body = await request.json();
  console.log("[API /leads/[id]] Updating lead:", id, "with:", body, "user:", user.id, "brokerId:", brokerId);

  // Update the lead
  const { data, error } = await supabase
    .from("leads")
    .update(body)
    .eq("id", id)
    .eq("broker_id", brokerId)
    .select()
    .single();

  if (error) {
    console.error("[API /leads/[id]] Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log("[API /leads/[id]] Update successful, new data:", data);

  if (!data) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Revalidate cached pages so navigation shows fresh data
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);

  return NextResponse.json(data);
}

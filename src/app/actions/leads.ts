"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase-server";

export async function updateLead(leadId: string, data: Record<string, unknown>) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Determine the broker_id - either the user is the owner or a team member
  const brokerId = user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id
    ? user.user_metadata.broker_id
    : user.id;

  const { data: updatedLead, error } = await supabase
    .from("leads")
    .update(data)
    .eq("id", leadId)
    .eq("broker_id", brokerId)
    .select()
    .single();

  if (error) {
    console.error("[updateLead] Error:", error);
    return { error: error.message };
  }

  // Revalidate all lead-related pages
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);

  return { data: updatedLead };
}

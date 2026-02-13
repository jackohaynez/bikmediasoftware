export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase-server";
import { LeadsTable } from "@/components/leads/LeadsTable";

export default async function LeadsPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Determine the broker_id - either the user is the owner or a team member
  let brokerId = user.id;

  // Check if user is a team member (has broker_id in metadata)
  if (user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id) {
    brokerId = user.user_metadata.broker_id;
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("broker_id", brokerId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-destructive">Error loading leads: {error.message}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Manage and track all your leads
        </p>
      </div>

      <LeadsTable leads={leads || []} />
    </div>
  );
}

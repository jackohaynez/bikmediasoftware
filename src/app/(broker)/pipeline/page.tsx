export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase-server";
import { PipelineView } from "@/components/leads/PipelineView";

export default async function PipelinePage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Determine the broker_id - either the user is the owner or a team member
  let brokerId = user.id;
  if (user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id) {
    brokerId = user.user_metadata.broker_id;
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("broker_id", brokerId)
    .neq("status", "lost") // Exclude lost leads from pipeline
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="text-destructive">Error loading pipeline: {error.message}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">
          Manage your leads with board or table view
        </p>
      </div>

      <PipelineView leads={leads || []} />
    </div>
  );
}

export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase-server";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export default async function AnalyticsPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const role = user.user_metadata?.role;
  const brokerId = role === "broker" ? user.id : user.user_metadata?.broker_id;

  if (!brokerId) {
    return <div>No broker ID found</div>;
  }

  // Fetch all data needed for analytics
  const [leadsResult, callLogsResult, teamMembersResult, brokerResult] = await Promise.all([
    supabase.from("leads").select("*").eq("broker_id", brokerId),
    supabase.from("call_logs").select("*").eq("broker_id", brokerId),
    supabase.from("team_members").select("*").eq("broker_id", brokerId),
    supabase.from("brokers").select("*").eq("id", brokerId).single(),
  ]);

  const leads = leadsResult.data || [];
  const callLogs = callLogsResult.data || [];
  const teamMembers = teamMembersResult.data || [];
  const broker = brokerResult.data || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your leads and team performance
        </p>
      </div>

      <AnalyticsDashboard
        leads={leads}
        callLogs={callLogs}
        teamMembers={teamMembers}
        broker={broker}
      />
    </div>
  );
}

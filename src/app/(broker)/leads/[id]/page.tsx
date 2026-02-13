export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { LeadDetailForm } from "@/components/leads/LeadDetailForm";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Determine the broker_id - either the user is the owner or a team member
  const brokerId = user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id
    ? user.user_metadata.broker_id
    : user.id;

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("broker_id", brokerId)
    .single();

  if (error || !lead) {
    notFound();
  }

  return <LeadDetailForm lead={lead} />;
}

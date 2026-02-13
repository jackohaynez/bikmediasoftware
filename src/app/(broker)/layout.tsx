import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.user_metadata?.role;
  if (role === "admin") {
    redirect("/brokers");
  }

  // Get the broker ID - either the user's own ID (if broker) or from team_members table (if team member)
  let brokerId = user.id;
  let accountName: string | null = null;

  if (role === "team_member") {
    // Get the broker_id from team_members table
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("broker_id")
      .eq("user_id", user.id)
      .single();

    if (teamMember) {
      brokerId = (teamMember as { broker_id: string }).broker_id;
    }
  }

  // Fetch the broker's account name
  const { data: broker } = await supabase
    .from("brokers")
    .select("name, company")
    .eq("id", brokerId)
    .single();

  if (broker) {
    accountName = broker.company || broker.name;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        role={role === "team_member" ? "team_member" : "broker"}
        accountName={accountName}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email || ""}
          userName={user.user_metadata?.name}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

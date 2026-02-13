import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AdminLayout({
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
  if (role !== "admin") {
    redirect("/analytics");
  }

  return (
    <div className="flex h-screen">
      <Sidebar role="admin" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={user.email || ""} userName={user.user_metadata?.name} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

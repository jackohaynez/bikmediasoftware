export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if admin or broker based on user metadata
    const role = user.user_metadata?.role;
    if (role === "admin") {
      redirect("/brokers");
    } else {
      redirect("/analytics");
    }
  }

  redirect("/login");
}

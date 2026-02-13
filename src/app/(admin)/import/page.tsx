export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase-server";
import { CSVImporter } from "@/components/admin/CSVImporter";

export default async function ImportPage() {
  const supabase = await createServerClient();

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching brokers:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Leads</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to import leads for a sub account
        </p>
      </div>

      <CSVImporter brokers={brokers || []} />
    </div>
  );
}

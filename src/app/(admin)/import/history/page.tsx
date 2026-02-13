export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CsvImport } from "@/types/supabase";

interface ImportWithBroker extends CsvImport {
  broker: { name: string; email: string; company: string | null } | null;
}

export default async function ImportHistoryPage() {
  const supabase = createAdminClient();

  const { data: imports, error } = await supabase
    .from("csv_imports")
    .select(
      `
      *,
      broker:brokers(name, email, company)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import History</h1>
        <p className="text-muted-foreground">
          View past CSV imports and their results
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>Last 50 import operations</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive">
              Error loading history: {error.message}
            </div>
          ) : imports && imports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sub Account</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: ImportWithBroker) => (
                  <TableRow key={imp.id}>
                    <TableCell>
                      {new Date(imp.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {imp.broker?.company || imp.broker?.name || "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {imp.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{imp.imported_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {(imp.skipped_count || 0) > 0 ? (
                        <Badge variant="warning">{imp.skipped_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(imp.error_count || 0) > 0 ? (
                        <Badge variant="destructive">{imp.error_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No imports yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

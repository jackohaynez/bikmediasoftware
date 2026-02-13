export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import type { Broker } from "@/types/supabase";

export default async function BrokersPage() {
  const supabase = await createServerClient();

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sub Accounts</h1>
          <p className="text-white/60">
            Manage sub accounts and their access
          </p>
        </div>
        <Link href="/brokers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Sub Account
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sub Accounts</CardTitle>
          <CardDescription>
            {brokers?.length || 0} sub account{brokers?.length !== 1 ? "s" : ""}{" "}
            registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive">Error loading sub accounts: {error.message}</div>
          ) : brokers && brokers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((broker: Broker) => (
                  <TableRow key={broker.id} className="cursor-pointer hover:bg-white/5">
                    <TableCell className="font-medium">
                      <Link href={`/brokers/${broker.id}`} className="text-blue-400 hover:underline">
                        {broker.company || broker.name}
                      </Link>
                    </TableCell>
                    <TableCell>{broker.name}</TableCell>
                    <TableCell>
                      {new Date(broker.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-white/40">
              No sub accounts yet. Click "Create Sub Account" to create one.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead, CallLog, TeamMember, Broker } from "@/types/supabase";

interface UserPerformanceTableProps {
  leads: Lead[];
  callLogs: CallLog[];
  teamMembers: TeamMember[];
  broker: Broker | null;
}

interface UserMetrics {
  id: string;
  name: string;
  email: string;
  leadsAssigned: number;
  callsMade: number;
  totalCallTime: number;
  settledCount: number;
  conversionRate: number;
  avgCallDuration: number;
}

export function UserPerformanceTable({ leads, callLogs, teamMembers, broker }: UserPerformanceTableProps) {
  // Build user map
  const userMap: Record<string, { id: string; name: string; email: string; userId: string }> = {};

  if (broker) {
    userMap[broker.id] = {
      id: broker.id,
      name: broker.name,
      email: broker.email,
      userId: broker.id,
    };
  }

  teamMembers.forEach((tm) => {
    userMap[tm.user_id] = {
      id: tm.id,
      name: tm.name || tm.email,
      email: tm.email,
      userId: tm.user_id,
    };
  });

  // Calculate metrics for each user
  const metrics: UserMetrics[] = Object.values(userMap).map((user) => {
    const assignedLeads = leads.filter((l) => l.assigned_to === user.userId);
    const settledLeads = assignedLeads.filter((l) => l.status === "settled");
    const userCallLogs = callLogs.filter((cl) => cl.user_id === user.userId);
    const totalCallTime = userCallLogs.reduce((sum, cl) => sum + (cl.duration_seconds || 0), 0);
    const avgCallDuration = userCallLogs.length > 0 ? totalCallTime / userCallLogs.length : 0;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      leadsAssigned: assignedLeads.length,
      callsMade: userCallLogs.length,
      totalCallTime,
      settledCount: settledLeads.length,
      conversionRate: assignedLeads.length > 0
        ? (settledLeads.length / assignedLeads.length) * 100
        : 0,
      avgCallDuration,
    };
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Call Time</TableHead>
              <TableHead className="text-right">Avg Call</TableHead>
              <TableHead className="text-right">Settled</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">{user.leadsAssigned}</TableCell>
                <TableCell className="text-right">{user.callsMade}</TableCell>
                <TableCell className="text-right">{formatTime(user.totalCallTime)}</TableCell>
                <TableCell className="text-right">{formatTime(user.avgCallDuration)}</TableCell>
                <TableCell className="text-right font-medium text-emerald-500">
                  {user.settledCount}
                </TableCell>
                <TableCell className="text-right">
                  {user.conversionRate.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            {metrics.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No brokers yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

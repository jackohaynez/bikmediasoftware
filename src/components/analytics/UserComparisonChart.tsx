"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead, CallLog, TeamMember, Broker } from "@/types/supabase";

interface UserComparisonChartProps {
  leads: Lead[];
  callLogs: CallLog[];
  teamMembers: TeamMember[];
  broker: Broker | null;
}

export function UserComparisonChart({ leads, callLogs, teamMembers, broker }: UserComparisonChartProps) {
  // Build user map
  const userMap: Record<string, { name: string; userId: string }> = {};

  if (broker) {
    userMap[broker.id] = {
      name: broker.name.split(" ")[0] || "Owner",
      userId: broker.id,
    };
  }

  teamMembers.forEach((tm) => {
    userMap[tm.user_id] = {
      name: (tm.name || tm.email).split(" ")[0].substring(0, 10),
      userId: tm.user_id,
    };
  });

  // Calculate metrics for each user
  const chartData = Object.values(userMap)
    .map((user) => {
      const assignedLeads = leads.filter((l) => l.assigned_to === user.userId);
      const settledLeads = assignedLeads.filter((l) => l.status === "settled");
      const userCallLogs = callLogs.filter((cl) => cl.user_id === user.userId);

      return {
        name: user.name,
        leads: assignedLeads.length,
        calls: userCallLogs.length,
        settled: settledLeads.length,
      };
    })
    .filter((u) => u.leads > 0 || u.calls > 0)
    .sort((a, b) => b.settled - a.settled);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Comparison</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No team activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" name="Leads Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="calls" name="Calls Made" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="settled" name="Settled" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

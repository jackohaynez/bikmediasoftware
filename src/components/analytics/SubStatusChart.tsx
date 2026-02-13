"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/supabase";
import {
  PENDING_SUB_STATUS_CONFIG,
  BAD_LEAD_SUB_STATUS_CONFIG,
  type PendingSubStatus,
  type BadLeadSubStatus,
} from "@/types/supabase";

interface SubStatusChartProps {
  leads: Lead[];
  type: "pending" | "bad_lead";
}

export function SubStatusChart({ leads, type }: SubStatusChartProps) {
  const filteredLeads = leads.filter((l) => l.status === type);

  // Group by sub_status
  const subStatusCounts: Record<string, number> = {};

  filteredLeads.forEach((lead) => {
    if (lead.sub_status) {
      subStatusCounts[lead.sub_status] = (subStatusCounts[lead.sub_status] || 0) + 1;
    }
  });

  const config = type === "pending" ? PENDING_SUB_STATUS_CONFIG : BAD_LEAD_SUB_STATUS_CONFIG;

  const chartData = Object.entries(subStatusCounts)
    .map(([status, count]) => ({
      name: (config as Record<string, { label: string }>)[status]?.label || status,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const title = type === "pending" ? "Pending Sub-Status" : "Bad Lead Reasons";
  const color = type === "pending" ? "#f97316" : "#ef4444";

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

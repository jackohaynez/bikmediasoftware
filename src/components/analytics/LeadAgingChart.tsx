"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/supabase";
import { STATUS_CONFIG, LEAD_STATUSES, type LeadStatus } from "@/types/supabase";

interface LeadAgingChartProps {
  leads: Lead[];
}

const COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6",
  no_answer: "#eab308",
  call_back: "#a855f7",
  pending: "#f97316",
  settled: "#059669",
  bad_lead: "#ef4444",
};

export function LeadAgingChart({ leads }: LeadAgingChartProps) {
  const now = new Date();

  // Calculate average days in each status
  const activeStatuses: LeadStatus[] = ["new", "no_answer", "call_back", "pending"];

  const chartData = activeStatuses.map((status) => {
    const statusLeads = leads.filter((l) => l.status === status);
    let totalDays = 0;

    statusLeads.forEach((lead) => {
      const updatedAt = new Date(lead.updated_at);
      const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      totalDays += diffDays;
    });

    const avgDays = statusLeads.length > 0 ? totalDays / statusLeads.length : 0;

    return {
      name: STATUS_CONFIG[status].label,
      days: parseFloat(avgDays.toFixed(1)),
      count: statusLeads.length,
      status,
    };
  });

  const hasData = chartData.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Aging by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No active leads yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Aging by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              label={{ value: "Avg Days", angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { count?: number } }) => [
                `${value} days (${props.payload?.count || 0} leads)`,
                "Average Age",
              ]}
            />
            <Bar dataKey="days" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

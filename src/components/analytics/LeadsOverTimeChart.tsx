"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/supabase";

interface LeadsOverTimeChartProps {
  leads: Lead[];
}

export function LeadsOverTimeChart({ leads }: LeadsOverTimeChartProps) {
  // Group leads by day
  const dayMap: Record<string, number> = {};

  leads.forEach((lead) => {
    const date = new Date(lead.created_at).toISOString().split("T")[0];
    dayMap[date] = (dayMap[date] || 0) + 1;
  });

  // Sort by date and get last 30 days
  const sortedDays = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  const chartData = sortedDays.map(([date, count]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    leads: count,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads Over Time</CardTitle>
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
        <CardTitle>Leads Over Time (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

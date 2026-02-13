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

interface TurnoverChartProps {
  leads: Lead[];
}

export function TurnoverChart({ leads }: TurnoverChartProps) {
  // Group by monthly_turnover values
  const turnoverCounts: Record<string, number> = {};

  leads.forEach((lead) => {
    const turnover = lead.monthly_turnover || "Not Specified";
    turnoverCounts[turnover] = (turnoverCounts[turnover] || 0) + 1;
  });

  const chartData = Object.entries(turnoverCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Turnover Distribution</CardTitle>
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
        <CardTitle>Monthly Turnover Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

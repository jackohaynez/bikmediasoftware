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

interface ConversionBySourceChartProps {
  leads: Lead[];
}

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

export function ConversionBySourceChart({ leads }: ConversionBySourceChartProps) {
  // Group leads by source
  const sourceStats: Record<string, { total: number; settled: number }> = {};

  leads.forEach((lead) => {
    const source = lead.source || "Manual";
    if (!sourceStats[source]) {
      sourceStats[source] = { total: 0, settled: 0 };
    }
    sourceStats[source].total++;
    if (lead.status === "settled") {
      sourceStats[source].settled++;
    }
  });

  // Calculate conversion rates
  const chartData = Object.entries(sourceStats)
    .map(([source, stats]) => ({
      name: source,
      rate: stats.total > 0 ? (stats.settled / stats.total) * 100 : 0,
      total: stats.total,
      settled: stats.settled,
    }))
    .filter((d) => d.total >= 1) // Only show sources with at least 1 lead
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate by Source</CardTitle>
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
        <CardTitle>Conversion Rate by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { settled?: number; total?: number } }) => [
                `${value.toFixed(1)}% (${props.payload?.settled || 0}/${props.payload?.total || 0})`,
                "Conversion Rate",
              ]}
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

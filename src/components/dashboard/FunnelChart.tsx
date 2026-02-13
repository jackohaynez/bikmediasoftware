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
import { STATUS_CONFIG, type LeadStatus } from "@/types/supabase";

interface FunnelChartProps {
  data: Array<{ status: LeadStatus; count: number }>;
}

const FUNNEL_ORDER: LeadStatus[] = [
  "new",
  "no_answer",
  "call_back",
  "pending",
  "settled",
  "bad_lead",
];

const COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6",
  no_answer: "#eab308",
  call_back: "#a855f7",
  pending: "#f97316",
  settled: "#059669",
  bad_lead: "#ef4444",
};

export function FunnelChart({ data }: FunnelChartProps) {
  const chartData = FUNNEL_ORDER.map((status) => {
    const found = data.find((d) => d.status === status);
    return {
      name: STATUS_CONFIG[status].label,
      value: found?.count || 0,
      fill: COLORS[status],
    };
  });

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No leads yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

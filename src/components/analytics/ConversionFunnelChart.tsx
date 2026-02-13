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
import { STATUS_CONFIG, type LeadStatus } from "@/types/supabase";

interface ConversionFunnelChartProps {
  leads: Lead[];
}

const FUNNEL_ORDER: LeadStatus[] = [
  "new",
  "no_answer",
  "call_back",
  "pending",
  "settled",
];

const COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6",
  no_answer: "#eab308",
  call_back: "#a855f7",
  pending: "#f97316",
  settled: "#059669",
  bad_lead: "#ef4444",
};

export function ConversionFunnelChart({ leads }: ConversionFunnelChartProps) {
  const chartData = FUNNEL_ORDER.map((status) => ({
    name: STATUS_CONFIG[status].label,
    value: leads.filter((l) => l.status === status).length,
    status,
  }));

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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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

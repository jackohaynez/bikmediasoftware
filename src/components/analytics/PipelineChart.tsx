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

interface PipelineChartProps {
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

export function PipelineChart({ leads }: PipelineChartProps) {
  const chartData = LEAD_STATUSES.map((status) => ({
    name: STATUS_CONFIG[status].label,
    value: leads.filter((l) => l.status === status).length,
    status,
  }));

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
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
        <CardTitle>Pipeline Stages</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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

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

interface LoanTermChartProps {
  leads: Lead[];
}

export function LoanTermChart({ leads }: LoanTermChartProps) {
  // Group by loan_term values
  const termCounts: Record<string, number> = {};

  leads.forEach((lead) => {
    const term = lead.loan_term || "Not Specified";
    termCounts[term] = (termCounts[term] || 0) + 1;
  });

  const chartData = Object.entries(termCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loan Term Distribution</CardTitle>
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
        <CardTitle>Loan Term Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

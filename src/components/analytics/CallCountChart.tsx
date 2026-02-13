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

interface CallCountChartProps {
  leads: Lead[];
}

export function CallCountChart({ leads }: CallCountChartProps) {
  // Group leads by call count buckets
  const buckets = [
    { name: "0 calls", min: 0, max: 0 },
    { name: "1-2 calls", min: 1, max: 2 },
    { name: "3-5 calls", min: 3, max: 5 },
    { name: "6+ calls", min: 6, max: Infinity },
  ];

  const chartData = buckets.map((bucket) => ({
    name: bucket.name,
    value: leads.filter((l) => {
      const count = l.call_count || 0;
      return count >= bucket.min && count <= bucket.max;
    }).length,
  }));

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads by Call Count</CardTitle>
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
        <CardTitle>Leads by Call Count</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

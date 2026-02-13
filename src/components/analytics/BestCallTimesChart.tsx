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
import type { CallLog } from "@/types/supabase";

interface BestCallTimesChartProps {
  callLogs: CallLog[];
}

export function BestCallTimesChart({ callLogs }: BestCallTimesChartProps) {
  // Group calls by hour of day
  const hourCounts: Record<number, number> = {};
  const hourDurations: Record<number, number> = {};

  callLogs.forEach((log) => {
    const date = new Date(log.created_at);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    hourDurations[hour] = (hourDurations[hour] || 0) + (log.duration_seconds || 0);
  });

  // Create chart data for business hours (8am - 8pm)
  const chartData = [];
  for (let hour = 8; hour <= 20; hour++) {
    const count = hourCounts[hour] || 0;
    const totalDuration = hourDurations[hour] || 0;
    const avgDuration = count > 0 ? Math.round(totalDuration / count) : 0;

    chartData.push({
      hour: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "pm" : "am"}`,
      calls: count,
      avgDuration,
    });
  }

  const hasData = chartData.some((d) => d.calls > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call Activity by Hour</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No call data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Activity by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "calls") return [value, "Calls"];
                const mins = Math.floor(value / 60);
                const secs = value % 60;
                return [`${mins}:${secs.toString().padStart(2, "0")}`, "Avg Duration"];
              }}
            />
            <Bar dataKey="calls" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

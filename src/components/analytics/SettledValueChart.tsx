"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/supabase";
import { parseLoanAmount, calculateCommission, formatCurrency } from "@/lib/loan-utils";

interface SettledValueChartProps {
  leads: Lead[];
  commissionRate: number;
}

export function SettledValueChart({ leads, commissionRate }: SettledValueChartProps) {
  // Get settled leads and group by month
  const settledLeads = leads.filter((l) => l.status === "settled");

  const monthMap: Record<string, number> = {};

  settledLeads.forEach((lead) => {
    const date = new Date(lead.updated_at || lead.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const loanValue = parseLoanAmount(lead.loan_amount);
    const commission = calculateCommission(loanValue, commissionRate);
    monthMap[monthKey] = (monthMap[monthKey] || 0) + commission;
  });

  // Sort by date and get last 12 months
  const sortedMonths = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);

  const chartData = sortedMonths.map(([month, value]) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return {
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      value,
    };
  });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No settled leads yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Over Time ({commissionRate}% commission)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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

interface ConversionByAmountChartProps {
  leads: Lead[];
}

// Parse loan amount string to number
function parseLoanAmount(amount: string | null): number {
  if (!amount) return 0;
  let cleaned = amount.replace(/[$,]/g, "").trim().toLowerCase();
  if (cleaned.endsWith("k")) {
    return parseFloat(cleaned.slice(0, -1)) * 1000 || 0;
  }
  return parseFloat(cleaned) || 0;
}

export function ConversionByAmountChart({ leads }: ConversionByAmountChartProps) {
  // Define loan amount buckets
  const buckets = [
    { name: "$0-25K", min: 0, max: 25000 },
    { name: "$25K-50K", min: 25000, max: 50000 },
    { name: "$50K-100K", min: 50000, max: 100000 },
    { name: "$100K-250K", min: 100000, max: 250000 },
    { name: "$250K-500K", min: 250000, max: 500000 },
    { name: "$500K+", min: 500000, max: Infinity },
  ];

  // Calculate conversion rates per bucket
  const chartData = buckets.map((bucket) => {
    const bucketLeads = leads.filter((l) => {
      const amount = parseLoanAmount(l.loan_amount);
      return amount >= bucket.min && amount < bucket.max;
    });

    const settled = bucketLeads.filter((l) => l.status === "settled").length;
    const total = bucketLeads.length;
    const rate = total > 0 ? (settled / total) * 100 : 0;

    return {
      name: bucket.name,
      rate: parseFloat(rate.toFixed(1)),
      total,
      settled,
    };
  });

  const hasData = chartData.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate by Loan Amount</CardTitle>
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
        <CardTitle>Conversion Rate by Loan Amount</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { settled?: number; total?: number } }) => [
                `${value}% (${props.payload?.settled || 0}/${props.payload?.total || 0})`,
                "Conversion Rate",
              ]}
            />
            <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/supabase";
import { STATUS_CONFIG, type LeadStatus } from "@/types/supabase";

interface StageDropoffChartProps {
  leads: Lead[];
}

export function StageDropoffChart({ leads }: StageDropoffChartProps) {
  const totalLeads = leads.length;
  if (totalLeads === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Drop-off Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No leads yet</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate how many leads reach each stage (cumulative)
  // A lead "reaches" a stage if they are currently at that stage or beyond
  const stageOrder: LeadStatus[] = ["new", "no_answer", "call_back", "pending", "settled"];

  // Count leads at or past each stage
  const stageReached: Record<LeadStatus, number> = {
    new: 0,
    no_answer: 0,
    call_back: 0,
    pending: 0,
    settled: 0,
    bad_lead: 0,
  };

  leads.forEach((lead) => {
    const status = lead.status as LeadStatus;
    // Count this lead at their current stage
    // For funnel, we assume progression: new -> no_answer -> call_back -> pending -> settled
    const stageIndex = stageOrder.indexOf(status);

    // If not in normal flow (bad_lead), they dropped off
    if (stageIndex === -1) return;

    // Count as reaching current stage
    stageReached[status]++;
  });

  // Calculate cumulative and drop-off
  let cumulative = totalLeads;
  const chartData = stageOrder.map((status, index) => {
    const atStage = stageReached[status];
    const percentage = totalLeads > 0 ? (cumulative / totalLeads) * 100 : 0;

    // Next stage cumulative (subtract those who stayed at this stage or dropped)
    if (status !== "settled") {
      cumulative = cumulative - atStage;
    }

    return {
      name: STATUS_CONFIG[status].label,
      remaining: parseFloat(percentage.toFixed(1)),
      count: atStage,
      status,
    };
  });

  // Recalculate based on actual distribution for clearer visualization
  const funnelData = stageOrder.map((status) => {
    // Count leads that reached this stage or beyond
    const stageIdx = stageOrder.indexOf(status);
    let reachedCount = 0;

    leads.forEach((lead) => {
      const leadStatus = lead.status as LeadStatus;
      const leadIdx = stageOrder.indexOf(leadStatus);

      // Lead reached this stage if they're at or past this stage
      if (leadIdx >= stageIdx) {
        reachedCount++;
      }
    });

    return {
      name: STATUS_CONFIG[status].label,
      percentage: totalLeads > 0 ? (reachedCount / totalLeads) * 100 : 0,
      count: reachedCount,
      status,
    };
  });

  const COLORS: Record<LeadStatus, string> = {
    new: "#3b82f6",
    no_answer: "#eab308",
    call_back: "#a855f7",
    pending: "#f97316",
    settled: "#059669",
    bad_lead: "#ef4444",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage Progression Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { count?: number } }) => [
                `${value.toFixed(1)}% (${props.payload?.count || 0} leads)`,
                "Reached",
              ]}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

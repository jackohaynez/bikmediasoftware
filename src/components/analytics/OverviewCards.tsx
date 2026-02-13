"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, DollarSign, Phone, Percent } from "lucide-react";
import type { Lead, CallLog } from "@/types/supabase";

interface OverviewCardsProps {
  leads: Lead[];
  callLogs: CallLog[];
}

export function OverviewCards({ leads, callLogs }: OverviewCardsProps) {
  const totalLeads = leads.length;
  const settledLeads = leads.filter((l) => l.status === "settled").length;
  const settledRate = totalLeads > 0 ? ((settledLeads / totalLeads) * 100).toFixed(1) : "0";

  const totalCallCount = leads.reduce((sum, l) => sum + (l.call_count || 0), 0);
  const avgCallsPerLead = totalLeads > 0 ? (totalCallCount / totalLeads).toFixed(1) : "0";

  const totalCallDuration = callLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
  const avgCallDuration = callLogs.length > 0 ? Math.round(totalCallDuration / callLogs.length) : 0;
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const cards = [
    {
      title: "Total Leads",
      value: totalLeads,
      icon: Users,
      description: "All leads in pipeline",
    },
    {
      title: "Settled Rate",
      value: `${settledRate}%`,
      icon: Percent,
      description: `${settledLeads} settled`,
      color: "text-emerald-500",
    },
    {
      title: "Avg Calls per Lead",
      value: avgCallsPerLead,
      icon: Phone,
      description: `${totalCallCount} total calls`,
      color: "text-blue-500",
    },
    {
      title: "Avg Call Duration",
      value: formatDuration(avgCallDuration),
      icon: Phone,
      description: `${callLogs.length} call logs`,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

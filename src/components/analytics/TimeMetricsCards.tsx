"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, PhoneOutgoing, CheckCircle, Hourglass } from "lucide-react";
import type { Lead, CallLog } from "@/types/supabase";

interface TimeMetricsCardsProps {
  leads: Lead[];
  callLogs: CallLog[];
}

function formatDays(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }
  return `${days.toFixed(1)}d`;
}

export function TimeMetricsCards({ leads, callLogs }: TimeMetricsCardsProps) {
  // Build map of first call per lead
  const firstCallMap: Record<string, Date> = {};
  callLogs.forEach((log) => {
    const logDate = new Date(log.created_at);
    if (!firstCallMap[log.lead_id] || logDate < firstCallMap[log.lead_id]) {
      firstCallMap[log.lead_id] = logDate;
    }
  });

  // Calculate time to first contact
  let totalTimeToContact = 0;
  let contactCount = 0;
  leads.forEach((lead) => {
    if (firstCallMap[lead.id]) {
      const createdAt = new Date(lead.created_at);
      const firstCall = firstCallMap[lead.id];
      const diffDays = (firstCall.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0) {
        totalTimeToContact += diffDays;
        contactCount++;
      }
    }
  });
  const avgTimeToContact = contactCount > 0 ? totalTimeToContact / contactCount : 0;

  // Calculate time to settlement
  const settledLeads = leads.filter((l) => l.status === "settled");
  let totalTimeToSettlement = 0;
  settledLeads.forEach((lead) => {
    const createdAt = new Date(lead.created_at);
    const updatedAt = new Date(lead.updated_at);
    const diffDays = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    totalTimeToSettlement += diffDays;
  });
  const avgTimeToSettlement = settledLeads.length > 0
    ? totalTimeToSettlement / settledLeads.length
    : 0;

  // Calculate average calls to conversion
  const settledCallCounts = settledLeads.map((l) => l.call_count || 0);
  const avgCallsToConversion = settledCallCounts.length > 0
    ? settledCallCounts.reduce((a, b) => a + b, 0) / settledCallCounts.length
    : 0;

  // Calculate lead aging (avg time in current status for active leads)
  const activeLeads = leads.filter((l) =>
    ["new", "no_answer", "call_back", "pending"].includes(l.status)
  );
  const now = new Date();
  let totalAge = 0;
  activeLeads.forEach((lead) => {
    const updatedAt = new Date(lead.updated_at);
    const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    totalAge += diffDays;
  });
  const avgLeadAge = activeLeads.length > 0 ? totalAge / activeLeads.length : 0;

  const cards = [
    {
      title: "Avg Time to Contact",
      value: formatDays(avgTimeToContact),
      icon: PhoneOutgoing,
      description: `${contactCount} leads contacted`,
      color: "text-blue-500",
    },
    {
      title: "Avg Time to Settlement",
      value: formatDays(avgTimeToSettlement),
      icon: CheckCircle,
      description: `${settledLeads.length} leads settled`,
      color: "text-emerald-500",
    },
    {
      title: "Avg Calls to Conversion",
      value: avgCallsToConversion.toFixed(1),
      icon: Clock,
      description: "Calls per settled lead",
      color: "text-purple-500",
    },
    {
      title: "Avg Lead Age",
      value: formatDays(avgLeadAge),
      icon: Hourglass,
      description: `${activeLeads.length} active leads`,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
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

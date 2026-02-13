"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, PhoneOff, PhoneCall, Clock, DollarSign, XCircle } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    newLeads: number;
    noAnswer: number;
    callBack: number;
    pending: number;
    settled: number;
    badLead: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Leads",
      value: stats.total,
      icon: Users,
      description: "All leads in your pipeline",
    },
    {
      title: "New Leads",
      value: stats.newLeads,
      icon: Users,
      description: "Awaiting first contact",
      color: "text-blue-500",
    },
    {
      title: "No Answer",
      value: stats.noAnswer,
      icon: PhoneOff,
      description: "Could not reach",
      color: "text-yellow-500",
    },
    {
      title: "Call Back",
      value: stats.callBack,
      icon: PhoneCall,
      description: "Scheduled callback",
      color: "text-purple-500",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      description: "In progress",
      color: "text-orange-500",
    },
    {
      title: "Settled",
      value: stats.settled,
      icon: DollarSign,
      description: "Successfully settled",
      color: "text-emerald-600",
    },
    {
      title: "Bad Lead",
      value: stats.badLead,
      icon: XCircle,
      description: "Not viable",
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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

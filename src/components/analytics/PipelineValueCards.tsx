"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, Wallet, Percent } from "lucide-react";
import type { Lead, Broker } from "@/types/supabase";
import { parseLoanAmount, calculateCommission, formatCurrency } from "@/lib/loan-utils";

interface PipelineValueCardsProps {
  leads: Lead[];
  commissionRate: number;
}

export function PipelineValueCards({ leads, commissionRate }: PipelineValueCardsProps) {
  // Calculate pipeline values by status
  const pendingLeads = leads.filter((l) => l.status === "pending");
  const settledLeads = leads.filter((l) => l.status === "settled");
  const activeLeads = leads.filter((l) =>
    ["new", "no_answer", "call_back", "pending"].includes(l.status)
  );

  // Loan values
  const totalPipelineLoanValue = activeLeads.reduce(
    (sum, l) => sum + parseLoanAmount(l.loan_amount),
    0
  );

  const pendingLoanValue = pendingLeads.reduce(
    (sum, l) => sum + parseLoanAmount(l.loan_amount),
    0
  );

  const settledLoanValue = settledLeads.reduce(
    (sum, l) => sum + parseLoanAmount(l.loan_amount),
    0
  );

  // Commission-based revenue
  const pipelineCommission = calculateCommission(totalPipelineLoanValue, commissionRate);
  const pendingCommission = calculateCommission(pendingLoanValue, commissionRate);
  const settledCommission = calculateCommission(settledLoanValue, commissionRate);
  const avgCommissionPerDeal = settledLeads.length > 0
    ? settledCommission / settledLeads.length
    : 0;

  const cards = [
    {
      title: "Pipeline Revenue",
      value: formatCurrency(pipelineCommission),
      icon: Wallet,
      description: `${activeLeads.length} active leads (${formatCurrency(totalPipelineLoanValue)} loan value)`,
      color: "text-blue-500",
    },
    {
      title: "Pending Revenue",
      value: formatCurrency(pendingCommission),
      icon: Target,
      description: `${pendingLeads.length} pending (${formatCurrency(pendingLoanValue)} loan value)`,
      color: "text-orange-500",
    },
    {
      title: "Settled Revenue",
      value: formatCurrency(settledCommission),
      icon: DollarSign,
      description: `${settledLeads.length} closed (${formatCurrency(settledLoanValue)} loan value)`,
      color: "text-emerald-500",
    },
    {
      title: "Avg Revenue/Deal",
      value: formatCurrency(avgCommissionPerDeal),
      icon: TrendingUp,
      description: `${commissionRate}% commission rate`,
      color: "text-purple-500",
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

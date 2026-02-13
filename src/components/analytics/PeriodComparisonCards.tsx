"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Users, Phone, DollarSign, CheckCircle } from "lucide-react";
import type { Lead, CallLog } from "@/types/supabase";

interface PeriodComparisonCardsProps {
  leads: Lead[];
  callLogs: CallLog[];
}

function getDateRanges() {
  const now = new Date();

  // This week (Sun-Sat)
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonthStart);
  lastMonthEnd.setMilliseconds(-1);

  return {
    thisWeekStart,
    lastWeekStart,
    lastWeekEnd,
    thisMonthStart,
    lastMonthStart,
    lastMonthEnd,
  };
}

function formatChange(current: number, previous: number): { text: string; type: "up" | "down" | "same" } {
  if (previous === 0 && current === 0) return { text: "—", type: "same" };
  if (previous === 0) return { text: "+∞", type: "up" };

  const change = ((current - previous) / previous) * 100;

  if (Math.abs(change) < 1) return { text: "—", type: "same" };
  if (change > 0) return { text: `+${change.toFixed(0)}%`, type: "up" };
  return { text: `${change.toFixed(0)}%`, type: "down" };
}

export function PeriodComparisonCards({ leads, callLogs }: PeriodComparisonCardsProps) {
  const ranges = getDateRanges();

  // Calculate metrics for each period
  const thisWeekLeads = leads.filter((l) => new Date(l.created_at) >= ranges.thisWeekStart);
  const lastWeekLeads = leads.filter((l) => {
    const date = new Date(l.created_at);
    return date >= ranges.lastWeekStart && date < ranges.thisWeekStart;
  });

  const thisMonthLeads = leads.filter((l) => new Date(l.created_at) >= ranges.thisMonthStart);
  const lastMonthLeads = leads.filter((l) => {
    const date = new Date(l.created_at);
    return date >= ranges.lastMonthStart && date < ranges.thisMonthStart;
  });

  const thisWeekCalls = callLogs.filter((c) => new Date(c.created_at) >= ranges.thisWeekStart);
  const lastWeekCalls = callLogs.filter((c) => {
    const date = new Date(c.created_at);
    return date >= ranges.lastWeekStart && date < ranges.thisWeekStart;
  });

  const thisWeekSettled = thisWeekLeads.filter((l) => l.status === "settled").length;
  const lastWeekSettled = lastWeekLeads.filter((l) => l.status === "settled").length;

  const thisMonthSettled = thisMonthLeads.filter((l) => l.status === "settled").length;
  const lastMonthSettled = lastMonthLeads.filter((l) => l.status === "settled").length;

  const weekLeadsChange = formatChange(thisWeekLeads.length, lastWeekLeads.length);
  const weekCallsChange = formatChange(thisWeekCalls.length, lastWeekCalls.length);
  const weekSettledChange = formatChange(thisWeekSettled, lastWeekSettled);

  const monthLeadsChange = formatChange(thisMonthLeads.length, lastMonthLeads.length);
  const monthSettledChange = formatChange(thisMonthSettled, lastMonthSettled);

  const getIcon = (type: "up" | "down" | "same") => {
    if (type === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (type === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getColor = (type: "up" | "down" | "same") => {
    if (type === "up") return "text-emerald-500";
    if (type === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Week over Week</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekLeads.length}</div>
            <div className="flex items-center gap-1 text-xs">
              {getIcon(weekLeadsChange.type)}
              <span className={getColor(weekLeadsChange.type)}>{weekLeadsChange.text}</span>
              <span className="text-muted-foreground">vs last week ({lastWeekLeads.length})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekCalls.length}</div>
            <div className="flex items-center gap-1 text-xs">
              {getIcon(weekCallsChange.type)}
              <span className={getColor(weekCallsChange.type)}>{weekCallsChange.text}</span>
              <span className="text-muted-foreground">vs last week ({lastWeekCalls.length})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Settled</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekSettled}</div>
            <div className="flex items-center gap-1 text-xs">
              {getIcon(weekSettledChange.type)}
              <span className={getColor(weekSettledChange.type)}>{weekSettledChange.text}</span>
              <span className="text-muted-foreground">vs last week ({lastWeekSettled})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold pt-4">Month over Month</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads This Month</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthLeads.length}</div>
            <div className="flex items-center gap-1 text-xs">
              {getIcon(monthLeadsChange.type)}
              <span className={getColor(monthLeadsChange.type)}>{monthLeadsChange.text}</span>
              <span className="text-muted-foreground">vs last month ({lastMonthLeads.length})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Settled This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthSettled}</div>
            <div className="flex items-center gap-1 text-xs">
              {getIcon(monthSettledChange.type)}
              <span className={getColor(monthSettledChange.type)}>{monthSettledChange.text}</span>
              <span className="text-muted-foreground">vs last month ({lastMonthSettled})</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

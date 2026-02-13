"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OverviewCards,
  PipelineChart,
  CallCountChart,
  TurnoverChart,
  LoanAmountChart,
  LoanPurposeChart,
  LoanTermChart,
  MoneyTimelineChart,
  LeadSourceChart,
  LeadsOverTimeChart,
  SubStatusChart,
  Leaderboard,
  UserComparisonChart,
  UserPerformanceTable,
  PipelineValueCards,
  SettledValueChart,
  TimeMetricsCards,
  LeadAgingChart,
  BestCallTimesChart,
  ConversionBySourceChart,
  ConversionByAmountChart,
  StageDropoffChart,
} from "@/components/analytics";
import type { Lead, CallLog, TeamMember, Broker } from "@/types/supabase";

interface AnalyticsDashboardProps {
  leads: Lead[];
  callLogs: CallLog[];
  teamMembers: TeamMember[];
  broker: Broker | null;
}

type DateRange = "1d" | "7d" | "30d" | "90d" | "all";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1d", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

function getDateThreshold(range: DateRange): Date | null {
  if (range === "all") return null;

  const now = new Date();
  const days = {
    "1d": 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
  }[range];

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days);
  threshold.setHours(0, 0, 0, 0);
  return threshold;
}

export function AnalyticsDashboard({
  leads,
  callLogs,
  teamMembers,
  broker,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Filter data based on date range
  const { filteredLeads, filteredCallLogs } = useMemo(() => {
    const threshold = getDateThreshold(dateRange);

    if (!threshold) {
      return { filteredLeads: leads, filteredCallLogs: callLogs };
    }

    return {
      filteredLeads: leads.filter((lead) => new Date(lead.created_at) >= threshold),
      filteredCallLogs: callLogs.filter((log) => new Date(log.created_at) >= threshold),
    };
  }, [leads, callLogs, dateRange]);

  const rangeLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label || "All Time";

  // Get commission rate from broker settings (default to 2%)
  const commissionRate = broker?.commission_rate ?? 2;

  return (
    <div className="space-y-6">
      {/* Header with tabs and date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredLeads.length} leads and {filteredCallLogs.length} calls for {rangeLabel.toLowerCase()}
      </div>

      {/* Tab content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Financial Overview */}
          <PipelineValueCards leads={filteredLeads} commissionRate={commissionRate} />

          {/* Performance Metrics */}
          <TimeMetricsCards leads={filteredLeads} callLogs={filteredCallLogs} />

          {/* Key Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <LeadsOverTimeChart leads={filteredLeads} />
            <SettledValueChart leads={filteredLeads} commissionRate={commissionRate} />
          </div>

          <PipelineChart leads={filteredLeads} />
        </TabsContent>

        {/* Lead Details Tab */}
        <TabsContent value="leads" className="space-y-6 mt-0">
          <OverviewCards leads={filteredLeads} callLogs={filteredCallLogs} />

          <div className="grid gap-6 md:grid-cols-2">
            <LoanAmountChart leads={filteredLeads} />
            <LoanPurposeChart leads={filteredLeads} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <LoanTermChart leads={filteredLeads} />
            <MoneyTimelineChart leads={filteredLeads} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TurnoverChart leads={filteredLeads} />
            <LeadSourceChart leads={filteredLeads} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <CallCountChart leads={filteredLeads} />
            <LeadAgingChart leads={filteredLeads} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SubStatusChart leads={filteredLeads} type="pending" />
            <SubStatusChart leads={filteredLeads} type="bad_lead" />
          </div>
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <ConversionBySourceChart leads={filteredLeads} />
            <ConversionByAmountChart leads={filteredLeads} />
          </div>

          <StageDropoffChart leads={filteredLeads} />

          <div className="grid gap-6 md:grid-cols-2">
            <BestCallTimesChart callLogs={filteredCallLogs} />
            <CallCountChart leads={filteredLeads} />
          </div>
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent value="team" className="space-y-6 mt-0">
          <Leaderboard
            leads={filteredLeads}
            callLogs={filteredCallLogs}
            teamMembers={teamMembers}
            broker={broker}
          />

          <UserComparisonChart
            leads={filteredLeads}
            callLogs={filteredCallLogs}
            teamMembers={teamMembers}
            broker={broker}
          />

          <UserPerformanceTable
            leads={filteredLeads}
            callLogs={filteredCallLogs}
            teamMembers={teamMembers}
            broker={broker}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

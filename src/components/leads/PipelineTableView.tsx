"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, Mail, ArrowUpDown, Search, PhoneCall, Plus, Minus } from "lucide-react";
import { updateLead } from "@/app/actions/leads";
import { CallModal } from "./CallModal";
import type { Lead, TeamMemberOption } from "@/types/supabase";
import {
  STATUS_CONFIG,
  LEAD_STATUSES,
  PENDING_SUB_STATUSES,
  PENDING_SUB_STATUS_CONFIG,
  BAD_LEAD_SUB_STATUSES,
  BAD_LEAD_SUB_STATUS_CONFIG,
  type LeadStatus,
} from "@/types/supabase";

interface PipelineTableViewProps {
  leads: Lead[];
}

type SortField = "full_name" | "status" | "loan_amount" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";

export function PipelineTableView({ leads: initialLeads }: PipelineTableViewProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);

  // Sync leads when prop changes (e.g., from filter)
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  // Fetch team members for assignment dropdown
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const res = await fetch("/api/team-members");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.teamMembers || []);
        }
      } catch (err) {
        console.error("Failed to fetch team members:", err);
      }
    }
    fetchTeamMembers();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: newStatus, sub_status: null } : l
      )
    );

    const result = await updateLead(leadId, { status: newStatus, sub_status: null });

    if (result.error) {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: lead.status, sub_status: lead.sub_status } : l
        )
      );
    }
  };

  const handleSubStatusChange = async (leadId: string, subStatus: string | null) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, sub_status: subStatus } : l
      )
    );

    const result = await updateLead(leadId, { sub_status: subStatus });

    if (result.error) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, sub_status: lead.sub_status } : l
        )
      );
    }
  };

  const handleAssignmentChange = async (leadId: string, assignedTo: string | null) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, assigned_to: assignedTo } : l
      )
    );

    const result = await updateLead(leadId, { assigned_to: assignedTo });

    if (result.error) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, assigned_to: lead.assigned_to } : l
        )
      );
    }
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
  };

  const handleCallCountChange = async (leadId: string, newCount: number) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, call_count: newCount } : l
      )
    );

    const result = await updateLead(leadId, { call_count: newCount });

    if (result.error) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, call_count: lead.call_count } : l
        )
      );
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort leads
  const filteredLeads = leads
    .filter((lead) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lead.full_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.business_name?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (sortField) {
        case "full_name":
          aValue = a.full_name?.toLowerCase() || "";
          bValue = b.full_name?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "loan_amount":
          aValue = a.loan_amount || "";
          bValue = b.loan_amount || "";
          break;
        case "created_at":
          aValue = a.created_at || "";
          bValue = b.created_at || "";
          break;
        case "updated_at":
          aValue = a.updated_at || "";
          bValue = b.updated_at || "";
          break;
      }

      if (aValue === null || bValue === null) return 0;
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredLeads.length} leads
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <SortButton field="full_name">Name</SortButton>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[120px]">Calls</TableHead>
              <TableHead className="w-[140px]">
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead className="w-[140px]">Sub-Status</TableHead>
              <TableHead className="w-[150px]">Assigned To</TableHead>
              <TableHead>
                <SortButton field="loan_amount">Loan Amount</SortButton>
              </TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="w-[100px]">
                <SortButton field="updated_at">Updated</SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <p>{lead.full_name}</p>
                      {lead.business_name && (
                        <p className="text-xs text-muted-foreground">{lead.business_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {lead.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => window.open(`mailto:${lead.email}`, "_self")}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setCallModalLead(lead)}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const currentCount = lead.call_count || 0;
                          if (currentCount > 0) {
                            handleCallCountChange(lead.id, currentCount - 1);
                          }
                        }}
                        disabled={(lead.call_count || 0) <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {lead.call_count || 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCallCountChange(lead.id, (lead.call_count || 0) + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${STATUS_CONFIG[status].color}`}
                              />
                              {STATUS_CONFIG[status].label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(lead.status === "pending" || lead.status === "bad_lead") && (
                      <Select
                        value={lead.sub_status || "none"}
                        onValueChange={(value) =>
                          handleSubStatusChange(lead.id, value === "none" ? null : value)
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {lead.status === "pending"
                            ? PENDING_SUB_STATUSES.map((subStatus) => (
                                <SelectItem key={subStatus} value={subStatus}>
                                  {PENDING_SUB_STATUS_CONFIG[subStatus].label}
                                </SelectItem>
                              ))
                            : BAD_LEAD_SUB_STATUSES.map((subStatus) => (
                                <SelectItem key={subStatus} value={subStatus}>
                                  {BAD_LEAD_SUB_STATUS_CONFIG[subStatus].label}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.assigned_to || "unassigned"}
                      onValueChange={(value) =>
                        handleAssignmentChange(lead.id, value === "unassigned" ? null : value)
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{lead.loan_amount || "-"}</TableCell>
                  <TableCell>
                    {lead.loan_purpose ? (
                      <Badge variant="outline" className="text-xs">
                        {lead.loan_purpose}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.updated_at
                      ? new Date(lead.updated_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CallModal
        lead={callModalLead}
        open={!!callModalLead}
        onClose={() => setCallModalLead(null)}
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  );
}

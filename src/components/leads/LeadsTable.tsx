"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronUp, ChevronDown, Plus, Phone, Mail, PhoneCall, Trash2 } from "lucide-react";
import { CallModal } from "./CallModal";
import type { Lead, TeamMemberOption } from "@/types/supabase";
import {
  STATUS_CONFIG,
  LEAD_STATUSES,
  PENDING_SUB_STATUS_CONFIG,
  BAD_LEAD_SUB_STATUS_CONFIG,
  type LeadStatus,
  type PendingSubStatus,
  type BadLeadSubStatus,
} from "@/types/supabase";

interface LeadsTableProps {
  leads: Lead[];
}

type SortField = "full_name" | "created_at" | "loan_amount" | "status" | "call_count";
type SortDirection = "asc" | "desc";

export function LeadsTable({ leads: initialLeads }: LeadsTableProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);

  // Selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [leadsToDelete, setLeadsToDelete] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Fetch team members
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

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
  };

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return null;
    const member = teamMembers.find((m) => m.user_id === userId);
    return member?.name || null;
  };

  const getSubStatusLabel = (lead: Lead) => {
    if (!lead.sub_status) return null;
    if (lead.status === "pending") {
      return PENDING_SUB_STATUS_CONFIG[lead.sub_status as PendingSubStatus]?.label;
    }
    if (lead.status === "bad_lead") {
      return BAD_LEAD_SUB_STATUS_CONFIG[lead.sub_status as BadLeadSubStatus]?.label;
    }
    return null;
  };

  // Filter leads
  let filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      search === "" ||
      lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort leads
  filteredLeads = [...filteredLeads].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "full_name":
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case "created_at":
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "loan_amount":
        comparison = (a.loan_amount || "").localeCompare(b.loan_amount || "");
        break;
      case "status":
        comparison = LEAD_STATUSES.indexOf(a.status as LeadStatus) -
          LEAD_STATUSES.indexOf(b.status as LeadStatus);
        break;
      case "call_count":
        comparison = (a.call_count || 0) - (b.call_count || 0);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  const formatLoanAmount = (amount: string | null) => {
    if (!amount) return "-";
    return amount;
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeads.has(l.id));
  const isSomeSelected = selectedLeads.size > 0;

  // Delete handlers
  const openDeleteDialog = (leadIds: string[]) => {
    setLeadsToDelete(leadIds);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteSingle = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openDeleteDialog([leadId]);
  };

  const handleDeleteSelected = () => {
    openDeleteDialog(Array.from(selectedLeads));
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      const res = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: leadsToDelete }),
      });

      if (res.ok) {
        // Remove deleted leads from state
        setLeads((prev) => prev.filter((l) => !leadsToDelete.includes(l.id)));
        setSelectedLeads((prev) => {
          const newSelected = new Set(prev);
          leadsToDelete.forEach((id) => newSelected.delete(id));
          return newSelected;
        });
        setDeleteDialogOpen(false);
      } else {
        const data = await res.json();
        console.error("Delete failed:", data.error);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {isSomeSelected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedLeads.size})
            </Button>
          )}
          <Link href="/leads/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-white/60">
        Showing {filteredLeads.length} of {leads.length} leads
        {isSomeSelected && ` • ${selectedLeads.size} selected`}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("full_name")}
              >
                <div className="flex items-center">
                  Name
                  <SortIcon field="full_name" />
                </div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("loan_amount")}
              >
                <div className="flex items-center">
                  Loan
                  <SortIcon field="loan_amount" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("call_count")}
              >
                <div className="flex items-center">
                  Calls
                  <SortIcon field="call_count" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  <p className="text-white/40">
                    {leads.length === 0
                      ? "No leads yet. Add your first lead to get started."
                      : "No leads match your filters."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      aria-label={`Select ${lead.full_name}`}
                    />
                  </TableCell>
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
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
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
                            className="h-7 w-7 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => window.open(`mailto:${lead.email}`, "_self")}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setCallModalLead(lead)}
                          >
                            <PhoneCall className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatLoanAmount(lead.loan_amount)}</p>
                      {lead.loan_purpose && (
                        <p className="text-xs text-muted-foreground">{lead.loan_purpose}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        className={`${STATUS_CONFIG[lead.status as LeadStatus]?.color || "bg-gray-500"} text-white`}
                      >
                        {STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status}
                      </Badge>
                      {getSubStatusLabel(lead) && (
                        <p className="text-xs text-muted-foreground">{getSubStatusLabel(lead)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getAssignedUserName(lead.assigned_to) || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-white/70">{lead.call_count || 0}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => handleDeleteSingle(lead.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete {leadsToDelete.length === 1 ? "Lead" : `${leadsToDelete.length} Leads`}</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {leadsToDelete.length === 1 ? "this lead" : `these ${leadsToDelete.length} leads`}{" "}
              and all associated data including call logs, notes, and analytics.
              The data will be completely removed from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To confirm, type <span className="font-bold text-foreground">DELETE</span> below:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirmText !== "DELETE" || deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

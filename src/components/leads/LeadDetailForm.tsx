"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Plus, Minus, Loader2, Check, PhoneCall, Calendar, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase-browser";
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
  type PendingSubStatus,
  type BadLeadSubStatus,
} from "@/types/supabase";

interface LeadDetailFormProps {
  lead: Lead;
}

export function LeadDetailForm({ lead: initialLead }: LeadDetailFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [lead, setLead] = useState(initialLead);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const saveField = useCallback(async (field: keyof Lead, value: string | number | string[] | null) => {
    setSaving(true);
    setError(null);

    const result = await updateLead(initialLead.id, { [field]: value });

    if (result.error) {
      setError(result.error);
    } else {
      setLastSaved(new Date());
    }

    setSaving(false);
  }, [initialLead.id]);

  const handleChange = (
    field: keyof Lead,
    value: string | number | string[] | null,
    immediate = false
  ) => {
    setLead((prev) => ({ ...prev, [field]: value }));
    setLastSaved(null);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // For immediate updates (like selects), save right away
    if (immediate) {
      saveField(field, value);
    } else {
      // Debounce text input saves
      debounceTimerRef.current = setTimeout(() => {
        saveField(field, value);
      }, 500);
    }
  };

  const handleIncrementCall = () => {
    const newCount = (lead.call_count || 0) + 1;
    handleChange("call_count", newCount, true);
  };

  const handleDecrementCall = () => {
    const currentCount = lead.call_count || 0;
    if (currentCount <= 0) return;
    handleChange("call_count", currentCount - 1, true);
  };

  const handleDelete = async () => {
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    } else {
      router.push("/leads");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/pipeline")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lead.full_name}</h1>
            <p className="text-muted-foreground">
              Created {new Date(lead.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`${STATUS_CONFIG[lead.status as LeadStatus]?.color || "bg-gray-500"} text-white`}
          >
            {STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status}
          </Badge>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Lead</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this lead? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>Auto-saved</span>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={lead.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={lead.email || ""}
                    onChange={(e) => handleChange("email", e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      value={lead.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value || null)}
                    />
                    {lead.phone && (
                      <Button
                        variant="default"
                        size="icon"
                        className="bg-green-600 hover:bg-green-700 shrink-0"
                        onClick={() => setCallModalOpen(true)}
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_date">Lead Added Date</Label>
                <div className="flex gap-2">
                  <Input
                    id="lead_date"
                    value={lead.lead_date || ""}
                    onChange={(e) => handleChange("lead_date", e.target.value || null)}
                    placeholder="e.g., 2025-08-17T07:20:15.632Z"
                  />
                  <div className="relative shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        const picker = document.getElementById("lead_date_picker") as HTMLInputElement;
                        picker?.showPicker();
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <input
                      id="lead_date_picker"
                      type="datetime-local"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.value) {
                          const isoDate = new Date(e.target.value).toISOString();
                          handleChange("lead_date", isoDate, true);
                        }
                      }}
                    />
                  </div>
                </div>
                {lead.lead_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(lead.lead_date).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={lead.business_name || ""}
                  onChange={(e) => handleChange("business_name", e.target.value || null)}
                  placeholder="Company or business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_turnover">Average Monthly Turnover</Label>
                <Input
                  id="monthly_turnover"
                  value={lead.monthly_turnover || ""}
                  onChange={(e) => handleChange("monthly_turnover", e.target.value || null)}
                  placeholder="e.g., $50,000, Under $10k"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loan_amount">Loan Amount</Label>
                  <Input
                    id="loan_amount"
                    value={lead.loan_amount || ""}
                    onChange={(e) =>
                      handleChange("loan_amount", e.target.value || null)
                    }
                    placeholder="e.g., 500000 or Less than 10k"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan_purpose">Loan Purpose</Label>
                  <Input
                    id="loan_purpose"
                    value={lead.loan_purpose || ""}
                    onChange={(e) =>
                      handleChange("loan_purpose", e.target.value || null)
                    }
                    placeholder="e.g., Purchase, Refinance, Investment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan_term">Loan Term</Label>
                  <Input
                    id="loan_term"
                    value={lead.loan_term || ""}
                    onChange={(e) =>
                      handleChange("loan_term", e.target.value || null)
                    }
                    placeholder="e.g., 30 years, 5 years, 12 months"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="money_timeline">When Do They Need The Money?</Label>
                  <Input
                    id="money_timeline"
                    value={lead.money_timeline || ""}
                    onChange={(e) =>
                      handleChange("money_timeline", e.target.value || null)
                    }
                    placeholder="e.g., ASAP, Within 2 weeks, 1-3 months"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Add notes about this lead for future reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={lead.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value || null)}
                placeholder="Add notes about this lead..."
                rows={5}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={lead.status}
                onValueChange={(v) => {
                  handleChange("status", v, true);
                  // Clear sub_status when status changes
                  if (v !== "pending" && v !== "bad_lead") {
                    handleChange("sub_status", null, true);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {(lead.status === "pending" || lead.status === "bad_lead") && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {lead.status === "pending" ? "Pending Status" : "Bad Lead Reason"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={lead.sub_status || "none"}
                  onValueChange={(v) => handleChange("sub_status", v === "none" ? null : v, true)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select --</SelectItem>
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Call Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecrementCall}
                  disabled={(lead.call_count || 0) <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="text-4xl font-bold">{lead.call_count || 0}</div>
                  <p className="text-sm text-muted-foreground">calls</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncrementCall}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={lead.source || ""}
                onChange={(e) => handleChange("source", e.target.value || null)}
                placeholder="e.g., Website, Referral, Facebook"
              />
              {lead.external_id && (
                <p className="text-xs text-muted-foreground">
                  External ID: {lead.external_id}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={lead.assigned_to || "unassigned"}
                onValueChange={(v) => handleChange("assigned_to", v === "unassigned" ? null : v, true)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      <CallModal
        lead={lead}
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onLeadUpdated={(updatedLead) => {
          setLead(updatedLead);
          setLastSaved(new Date());
        }}
      />
    </div>
  );
}

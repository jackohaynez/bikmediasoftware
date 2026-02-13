"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Phone, Mail, Clock, SkipForward, User, Building2, DollarSign, Calendar, FileText, Timer, Users } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { updateLead } from "@/app/actions/leads";
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

const DIALER_STATUSES: LeadStatus[] = ["new", "no_answer", "call_back"];

type FilterOption = "all" | LeadStatus;
type UserFilterOption = "me" | "unassigned" | "all" | string;

interface Cooldown {
  lead_id: string;
  user_id: string;
  action: "called" | "skipped";
  expires_at: string;
}

export default function SpeedDialerPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("all");
  const [userFilter, setUserFilter] = useState<UserFilterOption>("me");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);

  // Call timer state
  const [isOnCall, setIsOnCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Editable form state
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  const currentLead = leads[currentIndex];

  // Fetch team members on mount
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

  useEffect(() => {
    async function fetchLeadsAndCooldowns() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Determine the broker_id - either the user is the owner or a team member
      const brokerId = user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id
        ? user.user_metadata.broker_id
        : user.id;

      // Fetch cooldowns first
      let activeCooldowns: Cooldown[] = [];
      try {
        const cooldownRes = await fetch("/api/lead-cooldowns");
        if (cooldownRes.ok) {
          const cooldownData = await cooldownRes.json();
          activeCooldowns = cooldownData.cooldowns || [];
          setCooldowns(activeCooldowns);
        }
      } catch (err) {
        console.error("Failed to fetch cooldowns:", err);
      }

      let query = supabase
        .from("leads")
        .select("*")
        .eq("broker_id", brokerId);

      if (selectedFilter === "all") {
        query = query.in("status", DIALER_STATUSES);
      } else {
        query = query.eq("status", selectedFilter);
      }

      // Apply user filter
      if (userFilter === "me") {
        query = query.eq("assigned_to", user.id);
      } else if (userFilter === "unassigned") {
        query = query.is("assigned_to", null);
      } else if (userFilter !== "all") {
        // Specific user ID selected
        query = query.eq("assigned_to", userFilter);
      }
      // "all" shows all leads regardless of assignment

      const { data, error } = await query.order("created_at", { ascending: true });

      if (!error && data) {
        // Filter out leads based on cooldowns
        const filteredData = data.filter((lead) => {
          // Check if lead was called by anyone (hide from all users)
          const calledCooldown = activeCooldowns.find(
            (c) => c.lead_id === lead.id && c.action === "called"
          );
          if (calledCooldown) return false;

          // Check if lead was skipped by current user (hide from this user only)
          const skippedByMe = activeCooldowns.find(
            (c) => c.lead_id === lead.id && c.action === "skipped" && c.user_id === user.id
          );
          if (skippedByMe) return false;

          return true;
        });

        setLeads(filteredData);
        setCurrentIndex(0);
        if (filteredData.length > 0) {
          setFormData(filteredData[0]);
        }
      }
      setLoading(false);
    }

    fetchLeadsAndCooldowns();
  }, [supabase, selectedFilter, userFilter]);

  useEffect(() => {
    if (currentLead) {
      setFormData(currentLead);
      setIsOnCall(false);
      setCallDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [currentLead]);

  useEffect(() => {
    if (isOnCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOnCall]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const recordCooldown = async (leadId: string, action: "called" | "skipped") => {
    try {
      await fetch("/api/lead-cooldowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, action }),
      });
    } catch (err) {
      console.error("Failed to record cooldown:", err);
    }
  };

  const handleCall = async () => {
    if (!currentLead?.phone) return;

    const newCount = (formData.call_count || 0) + 1;
    setFormData((prev) => ({ ...prev, call_count: newCount }));

    setIsOnCall(true);
    setCallDuration(0);

    window.open(`tel:${currentLead.phone}`, "_self");
  };

  const handleFieldChange = (field: keyof Lead, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData((prev) => ({
      ...prev,
      status: newStatus,
      sub_status: newStatus !== "pending" && newStatus !== "bad_lead" ? null : prev.sub_status,
    }));
  };

  const handleSave = async () => {
    if (!currentLead) return;
    setSaving(true);

    const dataToSave = {
      ...formData,
      call_count: formData.call_count || currentLead.call_count || 0,
    };

    await updateLead(currentLead.id, dataToSave);

    // Record "called" cooldown - hides from ALL users for 24 hours
    await recordCooldown(currentLead.id, "called");

    // Remove the lead from current list immediately
    setLeads((prev) => prev.filter((l) => l.id !== currentLead.id));

    setSaving(false);
    setIsOnCall(false);
    setCallDuration(0);

    // Adjust index if needed
    if (currentIndex >= leads.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleCancel = async () => {
    if (!currentLead) return;

    // Even if cancelled, a call was attempted, so record "called" cooldown
    await recordCooldown(currentLead.id, "called");

    // Remove the lead from current list immediately
    setLeads((prev) => prev.filter((l) => l.id !== currentLead.id));

    setIsOnCall(false);
    setCallDuration(0);

    // Adjust index if needed
    if (currentIndex >= leads.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleSkip = async () => {
    if (!currentLead) return;

    // Record "skipped" cooldown - hides from THIS user only for 24 hours
    await recordCooldown(currentLead.id, "skipped");

    // Remove the lead from current list immediately
    setLeads((prev) => prev.filter((l) => l.id !== currentLead.id));

    // Adjust index if needed
    if (currentIndex >= leads.length - 1) {
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Speed Dialer</h1>
          <p className="text-muted-foreground">
            {leads.length > 0
              ? `Lead ${currentIndex + 1} of ${leads.length}`
              : "No leads to call"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* User Assignment Filter */}
          <Select
            value={userFilter}
            onValueChange={(v) => setUserFilter(v as UserFilterOption)}
          >
            <SelectTrigger className="w-[180px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">My Leads</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="all">All Leads</SelectItem>
              {teamMembers
                .filter((m) => m.user_id !== currentUserId)
                .map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {/* Status Filter */}
          <Select
            value={selectedFilter}
            onValueChange={(v) => setSelectedFilter(v as FilterOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {DIALER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentLead && (
            <Button variant="outline" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip Lead
            </Button>
          )}
        </div>
      </div>

      {!currentLead ? (
        <Card>
          <CardContent className="py-20 text-center">
            <PhoneCall className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-xl text-muted-foreground">
              No leads to call
              {userFilter === "me" && " assigned to you"}
              {userFilter === "unassigned" && " that are unassigned"}
              {userFilter !== "all" && userFilter !== "me" && userFilter !== "unassigned" && ` for ${teamMembers.find((m) => m.user_id === userFilter)?.name || "selected broker"}`}
              {selectedFilter !== "all" && ` in ${STATUS_CONFIG[selectedFilter].label} status`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Lead Info & Call */}
          <div className="lg:col-span-1 space-y-4">
            {/* Lead Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">{formData.full_name}</h2>
                  {formData.business_name && (
                    <p className="text-muted-foreground text-sm">{formData.business_name}</p>
                  )}
                  {selectedFilter === "all" && currentLead.status && (
                    <Badge
                      className={`mt-2 ${STATUS_CONFIG[currentLead.status as LeadStatus]?.color || "bg-gray-500"} text-white`}
                    >
                      {STATUS_CONFIG[currentLead.status as LeadStatus]?.label || currentLead.status}
                    </Badge>
                  )}
                </div>

                {/* Phone & Call Button */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-center gap-2 text-lg mb-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono font-medium">{currentLead.phone || "No phone"}</span>
                  </div>

                  {isOnCall && (
                    <div className="flex items-center justify-center gap-2 mb-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Timer className="h-5 w-5 text-green-500" />
                      <span className="text-3xl font-mono font-bold text-green-500">
                        {formatTime(callDuration)}
                      </span>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                    onClick={handleCall}
                    disabled={!currentLead.phone}
                  >
                    <PhoneCall className="h-5 w-5 mr-2" />
                    {isOnCall ? "Call Again" : "Start Call"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground mt-3">
                    {formData.call_count || 0} previous calls
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            {!isOnCall && currentLead.email && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{currentLead.email}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                      onClick={() => window.open(`mailto:${currentLead.email}`, "_self")}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Details or Edit Form */}
          <div className="lg:col-span-2">
            {!isOnCall ? (
              /* Before Call - Show Lead Details */
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Lead Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentLead.loan_amount && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Loan Amount
                        </div>
                        <p className="font-medium">{currentLead.loan_amount}</p>
                      </div>
                    )}
                    {currentLead.loan_purpose && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground mb-1">Loan Purpose</div>
                        <p className="font-medium">{currentLead.loan_purpose}</p>
                      </div>
                    )}
                    {currentLead.loan_term && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground mb-1">Loan Term</div>
                        <p className="font-medium">{currentLead.loan_term}</p>
                      </div>
                    )}
                    {currentLead.monthly_turnover && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground mb-1">Monthly Turnover</div>
                        <p className="font-medium">{currentLead.monthly_turnover}</p>
                      </div>
                    )}
                    {currentLead.money_timeline && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          When Need Money
                        </div>
                        <p className="font-medium">{currentLead.money_timeline}</p>
                      </div>
                    )}
                    {currentLead.lead_date && (
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Lead Added
                        </div>
                        <p className="font-medium">{new Date(currentLead.lead_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {currentLead.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-accent/50">
                      <div className="text-xs text-muted-foreground mb-1">Notes</div>
                      <p className="text-sm whitespace-pre-wrap">{currentLead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* After Call Started - Show Edit Form */
              <div className="space-y-4">
                {/* Status Selection */}
                <Card>
                  <CardContent className="pt-6">
                    <Label className="mb-3 block">Update Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {LEAD_STATUSES.map((status) => (
                        <Button
                          key={status}
                          variant={formData.status === status ? "default" : "outline"}
                          size="sm"
                          className={
                            formData.status === status
                              ? `${STATUS_CONFIG[status].color} text-white border-0`
                              : ""
                          }
                          onClick={() => handleStatusChange(status)}
                        >
                          {STATUS_CONFIG[status].label}
                        </Button>
                      ))}
                    </div>

                    {(formData.status === "pending" || formData.status === "bad_lead") && (
                      <div className="mt-4">
                        <Label className="mb-2 block">
                          {formData.status === "pending" ? "Pending Status" : "Bad Lead Reason"}
                        </Label>
                        <Select
                          value={formData.sub_status || "none"}
                          onValueChange={(v) => handleFieldChange("sub_status", v === "none" ? null : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Select --</SelectItem>
                            {formData.status === "pending"
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardContent className="pt-6">
                    <Label htmlFor="notes" className="mb-2 block">Call Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => handleFieldChange("notes", e.target.value || null)}
                      placeholder="Add notes about this call..."
                      rows={4}
                    />
                  </CardContent>
                </Card>

                {/* Edit Lead Details */}
                <Card>
                  <CardContent className="pt-6">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium mb-4">
                        Edit Lead Details
                      </summary>
                      <div className="grid gap-4 sm:grid-cols-2 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name || ""}
                            onChange={(e) => handleFieldChange("full_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone || ""}
                            onChange={(e) => handleFieldChange("phone", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) => handleFieldChange("email", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_name">Business Name</Label>
                          <Input
                            id="business_name"
                            value={formData.business_name || ""}
                            onChange={(e) => handleFieldChange("business_name", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan_amount">Loan Amount</Label>
                          <Input
                            id="loan_amount"
                            value={formData.loan_amount || ""}
                            onChange={(e) => handleFieldChange("loan_amount", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan_purpose">Loan Purpose</Label>
                          <Input
                            id="loan_purpose"
                            value={formData.loan_purpose || ""}
                            onChange={(e) => handleFieldChange("loan_purpose", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan_term">Loan Term</Label>
                          <Input
                            id="loan_term"
                            value={formData.loan_term || ""}
                            onChange={(e) => handleFieldChange("loan_term", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monthly_turnover">Monthly Turnover</Label>
                          <Input
                            id="monthly_turnover"
                            value={formData.monthly_turnover || ""}
                            onChange={(e) => handleFieldChange("monthly_turnover", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="money_timeline">When Need Money</Label>
                          <Input
                            id="money_timeline"
                            value={formData.money_timeline || ""}
                            onChange={(e) => handleFieldChange("money_timeline", e.target.value || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lead_date">Lead Added Date</Label>
                          <Input
                            id="lead_date"
                            value={formData.lead_date || ""}
                            onChange={(e) => handleFieldChange("lead_date", e.target.value || null)}
                          />
                        </div>
                      </div>
                    </details>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 sticky bottom-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "End & Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

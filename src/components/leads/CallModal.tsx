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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  Phone,
  User,
  Timer,
  X,
} from "lucide-react";
import { updateLead } from "@/app/actions/leads";
import type { Lead } from "@/types/supabase";
import {
  STATUS_CONFIG,
  LEAD_STATUSES,
  PENDING_SUB_STATUSES,
  PENDING_SUB_STATUS_CONFIG,
  BAD_LEAD_SUB_STATUSES,
  BAD_LEAD_SUB_STATUS_CONFIG,
  type LeadStatus,
} from "@/types/supabase";

interface CallModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

export function CallModal({ lead, open, onClose, onLeadUpdated }: CallModalProps) {
  const [isOnCall, setIsOnCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form data when lead changes
  useEffect(() => {
    if (lead) {
      setFormData(lead);
      setIsOnCall(false);
      setCallDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [lead]);

  // Timer effect
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

  const handleCall = () => {
    if (!lead?.phone) return;

    const newCount = (formData.call_count || 0) + 1;
    setFormData((prev) => ({ ...prev, call_count: newCount }));

    setIsOnCall(true);
    setCallDuration(0);

    window.open(`tel:${lead.phone}`, "_self");
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
    if (!lead) return;
    setSaving(true);

    const dataToSave = {
      ...formData,
      call_count: formData.call_count || lead.call_count || 0,
    };

    // Save the lead update
    const result = await updateLead(lead.id, dataToSave);

    // Save call log with duration
    if (!result.error && callDuration > 0) {
      try {
        await fetch("/api/call-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: lead.id,
            duration_seconds: callDuration,
            notes: formData.notes || null,
          }),
        });
      } catch (err) {
        console.error("Failed to save call log:", err);
      }
    }

    if (!result.error && onLeadUpdated) {
      onLeadUpdated({ ...lead, ...dataToSave } as Lead);
    }

    setSaving(false);
    setIsOnCall(false);
    setCallDuration(0);
    onClose();
  };

  const handleCancel = () => {
    setIsOnCall(false);
    setCallDuration(0);
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div>{formData.full_name}</div>
              {formData.business_name && (
                <div className="text-sm font-normal text-muted-foreground">
                  {formData.business_name}
                </div>
              )}
            </div>
            <Badge
              className={`ml-auto ${STATUS_CONFIG[lead.status as LeadStatus]?.color || "bg-gray-500"} text-white`}
            >
              {STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Phone & Call Button */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="font-mono font-medium">{lead.phone || "No phone"}</span>
            </div>

            {isOnCall && (
              <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Timer className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-mono font-bold text-green-500">
                  {formatTime(callDuration)}
                </span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleCall}
              disabled={!lead.phone}
            >
              <PhoneCall className="h-5 w-5 mr-2" />
              {isOnCall ? "Call Again" : "Start Call"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {formData.call_count || 0} previous calls
            </p>
          </div>

          {/* Status Selection */}
          {isOnCall && (
            <>
              <div className="border rounded-lg p-4">
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
              </div>

              {/* Notes */}
              <div className="border rounded-lg p-4">
                <Label htmlFor="modal-notes" className="mb-2 block">
                  Call Notes
                </Label>
                <Textarea
                  id="modal-notes"
                  value={formData.notes || ""}
                  onChange={(e) => handleFieldChange("notes", e.target.value || null)}
                  placeholder="Add notes about this call..."
                  rows={3}
                />
              </div>

              {/* Edit Lead Details */}
              <details className="border rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Edit Lead Details
                </summary>
                <div className="grid gap-4 sm:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-full_name">Full Name</Label>
                    <Input
                      id="modal-full_name"
                      value={formData.full_name || ""}
                      onChange={(e) => handleFieldChange("full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-phone">Phone</Label>
                    <Input
                      id="modal-phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleFieldChange("phone", e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-email">Email</Label>
                    <Input
                      id="modal-email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleFieldChange("email", e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-business_name">Business Name</Label>
                    <Input
                      id="modal-business_name"
                      value={formData.business_name || ""}
                      onChange={(e) => handleFieldChange("business_name", e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-loan_amount">Loan Amount</Label>
                    <Input
                      id="modal-loan_amount"
                      value={formData.loan_amount || ""}
                      onChange={(e) => handleFieldChange("loan_amount", e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-loan_purpose">Loan Purpose</Label>
                    <Input
                      id="modal-loan_purpose"
                      value={formData.loan_purpose || ""}
                      onChange={(e) => handleFieldChange("loan_purpose", e.target.value || null)}
                    />
                  </div>
                </div>
              </details>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              {isOnCall ? "Cancel" : "Close"}
            </Button>
            {isOnCall && (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "End & Save"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

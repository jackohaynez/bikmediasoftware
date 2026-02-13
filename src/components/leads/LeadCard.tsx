"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, DollarSign, PhoneCall, Plus, Minus, UserPlus } from "lucide-react";
import type { Lead, TeamMemberOption } from "@/types/supabase";
import {
  PENDING_SUB_STATUSES,
  PENDING_SUB_STATUS_CONFIG,
  BAD_LEAD_SUB_STATUSES,
  BAD_LEAD_SUB_STATUS_CONFIG,
  type PendingSubStatus,
  type BadLeadSubStatus,
} from "@/types/supabase";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onSubStatusChange?: (leadId: string, subStatus: string | null) => void;
  onCallCountChange?: (leadId: string, newCount: number) => void;
  onCallClick?: (lead: Lead) => void;
  teamMembers?: TeamMemberOption[];
  onAssignmentChange?: (leadId: string, assignedTo: string | null) => void;
}

export function LeadCard({ lead, onClick, onSubStatusChange, onCallCountChange, onCallClick, teamMembers, onAssignmentChange }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showSubStatus = lead.status === "pending" || lead.status === "bad_lead";
  const subStatusOptions = lead.status === "pending"
    ? PENDING_SUB_STATUSES
    : BAD_LEAD_SUB_STATUSES;
  const subStatusConfig = lead.status === "pending"
    ? PENDING_SUB_STATUS_CONFIG
    : BAD_LEAD_SUB_STATUS_CONFIG;

  const handleSubStatusChange = (value: string) => {
    if (onSubStatusChange) {
      onSubStatusChange(lead.id, value === "none" ? null : value);
    }
  };

  const getSubStatusLabel = (subStatus: string | null) => {
    if (!subStatus) return null;
    if (lead.status === "pending") {
      return PENDING_SUB_STATUS_CONFIG[subStatus as PendingSubStatus]?.label;
    }
    return BAD_LEAD_SUB_STATUS_CONFIG[subStatus as BadLeadSubStatus]?.label;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="font-medium">{lead.full_name}</div>
        {lead.business_name && (
          <div className="text-xs text-muted-foreground">{lead.business_name}</div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Mail className="h-3 w-3" />
            <span className="truncate flex-1">{lead.email}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`mailto:${lead.email}`, "_self");
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Mail className="h-3 w-3" />
            </Button>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                if (onCallClick) {
                  onCallClick(lead);
                } else {
                  // Fallback: increment call count and open phone dialer
                  if (onCallCountChange) {
                    onCallCountChange(lead.id, (lead.call_count || 0) + 1);
                  }
                  window.open(`tel:${lead.phone}`, "_self");
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PhoneCall className="h-3 w-3" />
            </Button>
          </div>
        )}
        {lead.loan_amount && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <DollarSign className="h-3 w-3" />
            <span>{lead.loan_amount}</span>
          </div>
        )}
        <div
          className="flex items-center gap-2 text-xs text-white/60"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <PhoneCall className="h-3 w-3" />
          <span>{lead.call_count || 0} calls</span>
          {onCallCountChange && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1"
                onClick={() => {
                  const currentCount = lead.call_count || 0;
                  if (currentCount > 0) {
                    onCallCountChange(lead.id, currentCount - 1);
                  }
                }}
                disabled={(lead.call_count || 0) <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  onCallCountChange(lead.id, (lead.call_count || 0) + 1);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        {showSubStatus && onSubStatusChange && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Select
              value={lead.sub_status || "none"}
              onValueChange={handleSubStatusChange}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Select Status --</SelectItem>
                {subStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {(subStatusConfig as Record<string, { label: string }>)[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showSubStatus && !onSubStatusChange && lead.sub_status && (
          <Badge variant="secondary" className="text-xs">
            {getSubStatusLabel(lead.sub_status)}
          </Badge>
        )}
        {teamMembers && onAssignmentChange && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Select
              value={lead.assigned_to || "unassigned"}
              onValueChange={(value) => onAssignmentChange(lead.id, value === "unassigned" ? null : value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <UserPlus className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Assign..." />
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
          </div>
        )}
        {!onAssignmentChange && lead.assigned_to && teamMembers && (
          <Badge variant="outline" className="text-xs">
            <UserPlus className="h-3 w-3 mr-1" />
            {teamMembers.find((m) => m.user_id === lead.assigned_to)?.name || "Assigned"}
          </Badge>
        )}
        <div className="flex flex-wrap gap-1">
          {lead.loan_purpose && (
            <Badge variant="outline" className="text-xs">
              {lead.loan_purpose}
            </Badge>
          )}
          {lead.tags?.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

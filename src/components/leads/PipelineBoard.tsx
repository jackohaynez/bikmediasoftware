"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCard } from "./LeadCard";
import { CallModal } from "./CallModal";
import { updateLead } from "@/app/actions/leads";
import type { Lead, TeamMemberOption } from "@/types/supabase";
import { STATUS_CONFIG, type LeadStatus } from "@/types/supabase";

// Droppable column component
function DroppableColumn({
  status,
  children,
}: {
  status: LeadStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] space-y-2 rounded-lg transition-colors ${
        isOver ? "bg-white/10" : ""
      }`}
    >
      {children}
    </div>
  );
}

interface PipelineBoardProps {
  leads: Lead[];
}

const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "no_answer",
  "call_back",
  "pending",
  "settled",
  "bad_lead",
];

export function PipelineBoard({ leads: initialLeads }: PipelineBoardProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getLeadsByStatus = (status: LeadStatus) =>
    leads.filter((lead) => lead.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column (status)
    let newStatus = PIPELINE_STATUSES.find((s) => s === overId);

    // If not dropped on a column, check if dropped on another lead and get its status
    if (!newStatus) {
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        newStatus = targetLead.status as LeadStatus;
      }
    }

    if (newStatus) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        // Optimistic update - also clear sub_status when changing main status
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, status: newStatus, sub_status: null } : l
          )
        );

        // Persist to database via server action
        const result = await updateLead(leadId, { status: newStatus, sub_status: null });

        if (result.error) {
          // Revert on error
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, status: lead.status, sub_status: lead.sub_status } : l
            )
          );
        }
      }
    }
  };

  const handleSubStatusChange = async (leadId: string, subStatus: string | null) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, sub_status: subStatus } : l
      )
    );

    // Persist to database via server action
    const result = await updateLead(leadId, { sub_status: subStatus });

    if (result.error) {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, sub_status: lead.sub_status } : l
        )
      );
    }
  };

  const handleCallCountChange = async (leadId: string, newCount: number) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, call_count: newCount } : l
      )
    );

    // Persist to database via server action
    const result = await updateLead(leadId, { call_count: newCount });

    if (result.error) {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, call_count: lead.call_count } : l
        )
      );
    }
  };

  const handleAssignmentChange = async (leadId: string, assignedTo: string | null) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, assigned_to: assignedTo } : l
      )
    );

    // Persist to database via server action
    const result = await updateLead(leadId, { assigned_to: assignedTo });

    if (result.error) {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, assigned_to: lead.assigned_to } : l
        )
      );
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleCallClick = (lead: Lead) => {
    setCallModalLead(lead);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((status) => {
          const statusLeads = getLeadsByStatus(status);
          const config = STATUS_CONFIG[status];

          return (
            <div
              key={status}
              className="flex w-80 flex-shrink-0 flex-col"
            >
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {config.label}
                    </CardTitle>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white ${config.color}`}
                    >
                      {statusLeads.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 overflow-y-auto px-2">
                  <SortableContext
                    id={status}
                    items={statusLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn status={status}>
                      {statusLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          onSubStatusChange={handleSubStatusChange}
                          onCallCountChange={handleCallCountChange}
                          onCallClick={handleCallClick}
                          teamMembers={teamMembers}
                          onAssignmentChange={handleAssignmentChange}
                        />
                      ))}
                      {statusLeads.length === 0 && (
                        <div className="flex h-[80px] items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-xs text-white/40">
                          Drop leads here
                        </div>
                      )}
                    </DroppableColumn>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="opacity-80">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>

      <CallModal
        lead={callModalLead}
        open={!!callModalLead}
        onClose={() => setCallModalLead(null)}
        onLeadUpdated={handleLeadUpdated}
      />
    </DndContext>
  );
}

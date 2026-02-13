"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutGrid, Table2, UserCircle } from "lucide-react";
import { PipelineBoard } from "./PipelineBoard";
import { PipelineTableView } from "./PipelineTableView";
import type { Lead, TeamMemberOption } from "@/types/supabase";

interface PipelineViewProps {
  leads: Lead[];
}

type ViewMode = "board" | "table";
type UserFilter = "all" | "unassigned" | string;

export function PipelineView({ leads }: PipelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);

  // Fetch team members for the filter dropdown
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

  // Filter leads based on user selection
  const filteredLeads = leads.filter((lead) => {
    if (userFilter === "all") return true;
    if (userFilter === "unassigned") return !lead.assigned_to;
    return lead.assigned_to === userFilter;
  });

  return (
    <div className="space-y-4">
      {/* View Toggle and Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">View:</span>
          <div className="flex rounded-lg border border-white/10 p-1">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode("table")}
            >
              <Table2 className="h-4 w-4 mr-2" />
              Table
            </Button>
          </div>
        </div>

        {/* User Filter */}
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by broker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brokers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>

      {/* View Content */}
      {viewMode === "board" ? (
        <PipelineBoard leads={filteredLeads} />
      ) : (
        <PipelineTableView leads={filteredLeads} />
      )}
    </div>
  );
}

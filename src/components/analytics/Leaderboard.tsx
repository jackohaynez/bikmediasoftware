"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import type { Lead, CallLog, TeamMember, Broker } from "@/types/supabase";

interface LeaderboardProps {
  leads: Lead[];
  callLogs: CallLog[];
  teamMembers: TeamMember[];
  broker: Broker | null;
}

interface UserStats {
  id: string;
  name: string;
  leadsAssigned: number;
  callsMade: number;
  settledCount: number;
  conversionRate: number;
  totalCallTime: number;
  score: number;
}

export function Leaderboard({ leads, callLogs, teamMembers, broker }: LeaderboardProps) {
  // Build user map with broker + team members
  const userMap: Record<string, { id: string; name: string; userId: string }> = {};

  if (broker) {
    userMap[broker.id] = {
      id: broker.id,
      name: broker.name + " (Owner)",
      userId: broker.id,
    };
  }

  teamMembers.forEach((tm) => {
    userMap[tm.user_id] = {
      id: tm.id,
      name: tm.name || tm.email,
      userId: tm.user_id,
    };
  });

  // Calculate stats for each user
  const userStats: UserStats[] = Object.values(userMap).map((user) => {
    const assignedLeads = leads.filter((l) => l.assigned_to === user.userId);
    const settledLeads = assignedLeads.filter((l) => l.status === "settled");
    const userCallLogs = callLogs.filter((cl) => cl.user_id === user.userId);
    const totalCallTime = userCallLogs.reduce((sum, cl) => sum + (cl.duration_seconds || 0), 0);

    const conversionRate =
      assignedLeads.length > 0
        ? (settledLeads.length / assignedLeads.length) * 100
        : 0;

    // Score: weighted combination of metrics
    const score =
      settledLeads.length * 10 +
      userCallLogs.length * 2 +
      conversionRate * 0.5;

    return {
      id: user.id,
      name: user.name,
      leadsAssigned: assignedLeads.length,
      callsMade: userCallLogs.length,
      settledCount: settledLeads.length,
      conversionRate,
      totalCallTime,
      score,
    };
  });

  // Sort by score
  const rankedUsers = userStats
    .filter((u) => u.leadsAssigned > 0 || u.callsMade > 0)
    .sort((a, b) => b.score - a.score);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Award className="h-5 w-5 text-orange-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank + 1}</span>;
  };

  if (rankedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground">
            No team activity yet. Assign leads and make calls to see the leaderboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rankedUsers.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                index === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/50"
              }`}
            >
              <div className="w-8 flex justify-center">{getRankIcon(index)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user.name}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {user.leadsAssigned} leads
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {user.callsMade} calls
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-emerald-600/20 text-emerald-400">
                    {user.settledCount} settled
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{user.conversionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{formatTime(user.totalCallTime)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

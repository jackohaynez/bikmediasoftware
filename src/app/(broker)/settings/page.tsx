"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, Trash2, Users, Percent, Loader2, Check, Share2 } from "lucide-react";
import type { TeamMember } from "@/types/supabase";

interface Allocation {
  user_id: string;
  user_name: string;
  percentage: number;
}

export default function SettingsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Commission settings
  const [commissionRate, setCommissionRate] = useState<string>("");
  const [commissionLoading, setCommissionLoading] = useState(true);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);

  // Lead distribution settings
  const [distributionEnabled, setDistributionEnabled] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [distributionSaving, setDistributionSaving] = useState(false);
  const [distributionSaved, setDistributionSaved] = useState(false);
  const [distributionError, setDistributionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/settings/team");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTeamMembers(data.teamMembers || []);
      }
    } catch {
      setError("Failed to load brokers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchBrokerSettings();
    fetchDistributionSettings();
  }, []);

  // Sync allocations with team members when either changes
  useEffect(() => {
    if (!distributionLoading && !loading && teamMembers.length > 0) {
      const existingUserIds = new Set(allocations.map((a) => a.user_id));
      const teamMemberIds = new Set(teamMembers.map((m) => m.user_id));

      // Check if we need to add new team members or remove old ones
      const needsNewMembers = teamMembers.some((m) => !existingUserIds.has(m.user_id));
      const hasRemovedMembers = allocations.some((a) => !teamMemberIds.has(a.user_id));

      if (needsNewMembers || hasRemovedMembers) {
        const newAllocations = teamMembers.map((member) => {
          const existing = allocations.find((a) => a.user_id === member.user_id);
          return {
            user_id: member.user_id,
            user_name: member.name || member.email || "Unknown",
            percentage: existing?.percentage ?? 0,
          };
        });
        setAllocations(newAllocations);
      }
    }
  }, [teamMembers, loading, distributionLoading]);

  const fetchBrokerSettings = async () => {
    try {
      const res = await fetch("/api/settings/broker");
      const data = await res.json();
      if (!data.error && data.broker) {
        setCommissionRate(data.broker.commission_rate?.toString() || "2");
      }
    } catch {
      console.error("Failed to load broker settings");
    } finally {
      setCommissionLoading(false);
    }
  };

  const fetchDistributionSettings = async () => {
    try {
      const res = await fetch("/api/settings/lead-distribution");
      const data = await res.json();
      if (!data.error) {
        setDistributionEnabled(data.enabled || false);
        setAllocations(data.allocations || []);
      }
    } catch {
      console.error("Failed to load distribution settings");
    } finally {
      setDistributionLoading(false);
    }
  };

  const initializeAllocations = () => {
    // Initialize allocations from team members if not set
    const existingUserIds = new Set(allocations.map((a) => a.user_id));
    const newAllocations: Allocation[] = [...allocations];

    // Add any team members not already in allocations
    teamMembers.forEach((member) => {
      if (!existingUserIds.has(member.user_id)) {
        newAllocations.push({
          user_id: member.user_id,
          user_name: member.name || member.email || "Unknown",
          percentage: 0,
        });
      }
    });

    // If no allocations yet and we have team members, distribute evenly
    if (allocations.length === 0 && newAllocations.length > 0) {
      const evenPercentage = Math.floor(100 / newAllocations.length);
      const remainder = 100 - evenPercentage * newAllocations.length;
      newAllocations.forEach((a, i) => {
        a.percentage = evenPercentage + (i < remainder ? 1 : 0);
      });
    }

    setAllocations(newAllocations);
  };

  const handleAllocationChange = (userId: string, percentage: number) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.user_id === userId ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a
      )
    );
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleDistributionSave = async () => {
    setDistributionSaving(true);
    setDistributionSaved(false);
    setDistributionError(null);

    try {
      const res = await fetch("/api/settings/lead-distribution", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: distributionEnabled,
          allocations: distributionEnabled ? allocations.filter((a) => a.percentage > 0) : [],
        }),
      });
      const data = await res.json();

      if (data.error) {
        setDistributionError(data.error);
      } else {
        setDistributionSaved(true);
        setTimeout(() => setDistributionSaved(false), 2000);
      }
    } catch {
      setDistributionError("Failed to save distribution settings");
    } finally {
      setDistributionSaving(false);
    }
  };

  const handleCommissionSave = async () => {
    setCommissionSaving(true);
    setCommissionSaved(false);

    try {
      const res = await fetch("/api/settings/broker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_rate: parseFloat(commissionRate) || 0 }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setCommissionSaved(true);
        setTimeout(() => setCommissionSaved(false), 2000);
      }
    } catch {
      setError("Failed to save commission rate");
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess("Broker added successfully");
        setFormData({ email: "", password: "", name: "" });
        fetchTeamMembers();
      }
    } catch {
      setError("Failed to add broker");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this broker?")) return;

    setDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/settings/team/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess("Broker removed");
        fetchTeamMembers();
      }
    } catch {
      setError("Failed to remove broker");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and team</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-500">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Commission Rate
          </CardTitle>
          <CardDescription>
            Set the commission percentage your brokerage earns on loan amounts.
            This is used to calculate revenue in analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissionLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-24"
                  placeholder="2.00"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <Button
                onClick={handleCommissionSave}
                disabled={commissionSaving}
                size="sm"
              >
                {commissionSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : commissionSaved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  "Save"
                )}
              </Button>
              {commissionSaved && (
                <span className="text-sm text-emerald-500">Saved!</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Lead Distribution
          </CardTitle>
          <CardDescription>
            Automatically assign imported leads to brokers based on percentage allocation.
            When disabled, leads will need to be assigned manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {distributionLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="distribution-toggle">Auto-assign leads</Label>
                  <p className="text-sm text-muted-foreground">
                    {distributionEnabled
                      ? "Leads will be automatically distributed to brokers"
                      : "Leads will be unassigned until manually assigned"}
                  </p>
                </div>
                <Switch
                  id="distribution-toggle"
                  checked={distributionEnabled}
                  onCheckedChange={(checked) => {
                    setDistributionEnabled(checked);
                    if (checked && allocations.length === 0) {
                      initializeAllocations();
                    }
                  }}
                />
              </div>

              {distributionEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Broker Allocations</Label>
                    <span
                      className={`text-sm font-medium ${
                        totalPercentage === 100
                          ? "text-emerald-500"
                          : "text-destructive"
                      }`}
                    >
                      Total: {totalPercentage}%
                      {totalPercentage !== 100 && " (must equal 100%)"}
                    </span>
                  </div>

                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add brokers below to set up lead distribution.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => {
                        const allocation = allocations.find(
                          (a) => a.user_id === member.user_id
                        );
                        const percentage = allocation?.percentage ?? 0;

                        return (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-white/10 p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {member.name || member.email}
                              </p>
                              {member.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentage}
                                onChange={(e) =>
                                  handleAllocationChange(
                                    member.user_id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 text-center"
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {distributionError && (
                    <p className="text-sm text-destructive">{distributionError}</p>
                  )}

                  <Button
                    onClick={handleDistributionSave}
                    disabled={distributionSaving || (distributionEnabled && totalPercentage !== 100)}
                    className="w-full"
                  >
                    {distributionSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : distributionSaved ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : null}
                    {distributionSaving
                      ? "Saving..."
                      : distributionSaved
                      ? "Saved!"
                      : "Save Distribution Settings"}
                  </Button>
                </div>
              )}

              {!distributionEnabled && (
                <Button
                  onClick={handleDistributionSave}
                  disabled={distributionSaving}
                  variant="outline"
                  className="w-full"
                >
                  {distributionSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : distributionSaved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {distributionSaving
                    ? "Saving..."
                    : distributionSaved
                    ? "Saved!"
                    : "Save Settings"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Broker
          </CardTitle>
          <CardDescription>
            Add a new broker to your account. They will have access to all
            your leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Broker's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Broker"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Brokers
          </CardTitle>
          <CardDescription>
            {teamMembers.length === 0
              ? "No brokers yet"
              : `${teamMembers.length} broker${teamMembers.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-muted-foreground">
              Add brokers above to give them access to your leads.
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 p-3"
                >
                  <div>
                    <p className="font-medium">{member.name || "No name"}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(member.id)}
                    disabled={deleting === member.id}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
